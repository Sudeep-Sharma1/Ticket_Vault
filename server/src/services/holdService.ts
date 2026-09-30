import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { generateSecureToken } from '../utils/crypto';
import { socketEmitter } from './socketService';
import { waitlistService } from './waitlistService';
import { AppError } from '../middleware/errorHandler';

export const holdService = {
  /**
   * Concurrency-protected Atomic Seat Hold (CAS Pattern)
   * Guarantees that if 2+ users attempt to hold the same seat simultaneously,
   * exactly 1 user succeeds and the other gets a 409 Conflict error.
   */
  holdSeats: async (eventId: string, seatIds: string[], userId: string) => {
    if (!seatIds || seatIds.length === 0) {
      throw new AppError('No seats selected for hold', 400);
    }

    if (seatIds.length > 8) {
      throw new AppError('Maximum 8 seats can be selected per booking session', 400);
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
      throw new AppError(`Cannot hold seats for a ${event.status.toLowerCase()} event`, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new AppError('User not found for holding seats', 404);
    }

    const holdTtl = event.holdTtlMinutes || ENV.HOLD_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + holdTtl * 60 * 1000);
    const holdToken = generateSecureToken(24);

    // 1-3 run inside ONE transaction: the seat status change and the SeatHold
    // records are committed together or not at all. On a conflict, throwing
    // rolls back only the rows this request changed, so seats legitimately
    // held by other customers are never touched.
    await prisma.$transaction(async (tx) => {
      // 1. Atomic Compare-And-Swap (CAS) Update
      // Only seats currently in 'AVAILABLE' status will be updated to 'HELD'.
      const updateResult = await tx.seat.updateMany({
        where: {
          id: { in: seatIds },
          eventId,
          status: 'AVAILABLE',
        },
        data: {
          status: 'HELD',
          version: { increment: 1 },
        },
      });

      // 2. If not all seats could be locked atomically, a conflict occurred.
      // Throwing aborts the transaction and undoes this request's partial update.
      if (updateResult.count !== seatIds.length) {
        throw new AppError(
          'One or more selected seats were just taken or held by another customer. Please select available seats.',
          409
        );
      }

      // 3. Create SeatHold records (one per seat, all sharing the same holdToken)
      await tx.seatHold.createMany({
        data: seatIds.map((seatId) => ({
          eventId,
          seatId,
          userId,
          holdToken,
          expiresAt,
          isExpired: false,
        })),
      });
    });

    const heldSeats = await prisma.seat.findMany({
      where: { id: { in: seatIds } },
    });

    // 4. Broadcast real-time seat status update via WebSocket
    socketEmitter.emitSeatStatusChange(eventId, {
      seatIds,
      status: 'HELD',
      heldByUserId: userId,
      expiresAt,
    });

    console.log(
      `[Seat Hold Success] User ${user.email} (${userId}) held ${seatIds.length} seat(s) for event ${eventId} until ${expiresAt.toISOString()}`
    );

    return {
      holdToken,
      expiresAt,
      seats: heldSeats,
    };
  },

  /**
   * Release hold manually
   */
  releaseHold: async (holdToken: string, userId?: string) => {
    const holds = await prisma.seatHold.findMany({
      where: {
        holdToken,
        isExpired: false,
        ...(userId ? { userId } : {}),
      },
      include: { seat: true },
    });

    if (holds.length === 0) return { released: 0 };

    const eventId = holds[0].eventId;

    // Mark holds as expired
    await prisma.seatHold.updateMany({
      where: { holdToken },
      data: { isExpired: true },
    });

    // Process each seat: either offer to waitlist or set AVAILABLE
    for (const hold of holds) {
      if (hold.seat.status === 'HELD') {
        await waitlistService.assignNextInQueue(hold.eventId, hold.seatId, hold.seat.category);
      }
    }

    return { released: holds.length, eventId };
  },

  /**
   * Release all active holds for a specific user and event
   */
  releaseUserEventHolds: async (eventId: string, userId: string) => {
    const holds = await prisma.seatHold.findMany({
      where: {
        eventId,
        userId,
        isExpired: false,
      },
      include: { seat: true },
    });

    if (holds.length === 0) return { released: 0 };

    const holdIds = holds.map((h) => h.id);
    await prisma.seatHold.updateMany({
      where: { id: { in: holdIds } },
      data: { isExpired: true },
    });

    for (const hold of holds) {
      if (hold.seat.status === 'HELD') {
        await waitlistService.assignNextInQueue(eventId, hold.seatId, hold.seat.category);
      }
    }

    return { released: holds.length, eventId };
  },

  /**
   * Dev/Demo Tool: Reset all held seats for an event back to available immediately
   */
  resetEventHolds: async (eventId: string) => {
    await prisma.seatHold.updateMany({
      where: { eventId, isExpired: false },
      data: { isExpired: true },
    });

    const heldSeats = await prisma.seat.findMany({
      where: { eventId, status: 'HELD' },
    });

    const seatIds = heldSeats.map((s) => s.id);

    await prisma.seat.updateMany({
      where: { id: { in: seatIds } },
      data: { status: 'AVAILABLE', version: { increment: 1 } },
    });

    socketEmitter.emitSeatStatusChange(eventId, {
      seatIds,
      status: 'AVAILABLE',
    });

    return { released: seatIds.length, eventId };
  },

  /**
   * Get active hold details by holdToken
   */
  getHoldDetails: async (holdToken: string) => {
    const holds = await prisma.seatHold.findMany({
      where: {
        holdToken,
        isExpired: false,
      },
      include: {
        seat: true,
        event: {
          include: { venue: true },
        },
      },
    });

    if (holds.length === 0) {
      throw new AppError('Seat hold expired or not found. Please re-select your seats.', 404);
    }

    // Check if expired
    if (new Date() > holds[0].expiresAt) {
      // Mark expired
      await prisma.seatHold.updateMany({
        where: { holdToken },
        data: { isExpired: true },
      });
      for (const h of holds) {
        if (h.seat.status === 'HELD') {
          await waitlistService.assignNextInQueue(h.eventId, h.seatId, h.seat.category);
        }
      }
      throw new AppError('Your seat hold has expired. Seats have been released.', 410);
    }

    const event = holds[0].event;
    const seats = holds.map((h) => h.seat);
    const totalAmount = seats.reduce((sum, s) => sum + s.price, 0);

    return {
      holdToken,
      expiresAt: holds[0].expiresAt,
      event,
      seats,
      totalAmount,
    };
  },
};
