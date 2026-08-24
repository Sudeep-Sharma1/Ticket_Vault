import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { generateSecureToken } from '../utils/crypto';
import { socketEmitter } from './socketService';
import { emailService } from './emailService';
import { AppError } from '../middleware/errorHandler';

export const waitlistService = {
  /**
   * Add a customer to the FIFO waitlist queue for a specific category
   */
  joinWaitlist: async (eventId: string, userId: string, category: string) => {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: true },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Check if user is already waiting in this category
    const existing = await prisma.waitlistEntry.findFirst({
      where: {
        eventId,
        userId,
        category,
        status: { in: ['WAITING', 'OFFERED'] },
      },
    });

    if (existing) {
      throw new AppError(`You are already in the waitlist for ${category} category (Position #${existing.position})`, 400);
    }

    // Determine position
    const currentQueueCount = await prisma.waitlistEntry.count({
      where: {
        eventId,
        category,
        status: 'WAITING',
      },
    });

    const position = currentQueueCount + 1;

    const entry = await prisma.waitlistEntry.create({
      data: {
        eventId,
        userId,
        category,
        status: 'WAITING',
        position,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify listeners
    socketEmitter.emitWaitlistUpdate(eventId, {
      category,
      action: 'NEW_ENTRY',
      totalWaiting: position,
    });

    return entry;
  },

  /**
   * When a seat becomes available (cancellation or abandoned hold),
   * attempt to offer it immediately to the first waitlisted customer in that category.
   * If no waitlisted user exists, mark seat as AVAILABLE.
   */
  assignNextInQueue: async (eventId: string, seatId: string, category: string) => {
    // 1. Fetch seat
    const seat = await prisma.seat.findUnique({
      where: { id: seatId },
      include: { event: true },
    });

    if (!seat) return false;

    // 2. Find next waiting customer in FIFO order (oldest createdAt)
    const nextCandidate = await prisma.waitlistEntry.findFirst({
      where: {
        eventId,
        category,
        status: 'WAITING',
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: true,
        event: { include: { venue: true } },
      },
    });

    if (nextCandidate) {
      const offerToken = generateSecureToken(24);
      const offerExpiresAt = new Date(Date.now() + ENV.WAITLIST_OFFER_TTL_MINUTES * 60 * 1000);

      // Update waitlist entry status to OFFERED
      await prisma.waitlistEntry.update({
        where: { id: nextCandidate.id },
        data: {
          status: 'OFFERED',
          offerToken,
          offerExpiresAt,
          offeredSeatId: seatId,
        },
      });

      // Update seat status to WAITLIST_RESERVED
      await prisma.seat.update({
        where: { id: seatId },
        data: {
          status: 'WAITLIST_RESERVED',
          version: { increment: 1 },
        },
      });

      // Emit real-time seat update
      socketEmitter.emitSeatStatusChange(eventId, {
        seatIds: [seatId],
        status: 'WAITLIST_RESERVED',
      });

      socketEmitter.emitWaitlistUpdate(eventId, {
        category,
        action: 'OFFER_MADE',
      });

      // Send time-limited offer notification email
      await emailService.sendWaitlistOffer({
        recipientEmail: nextCandidate.user.email,
        customerName: nextCandidate.user.name,
        eventTitle: nextCandidate.event.title,
        category: seat.category,
        seatLabel: seat.label,
        offerToken,
        expiresAt: offerExpiresAt,
      });

      console.log(
        `[Waitlist Match] Seat ${seat.label} offered to ${nextCandidate.user.email} (Expires at ${offerExpiresAt.toISOString()})`
      );

      return true;
    } else {
      // No one waiting in this category -> Seat becomes AVAILABLE to general public
      await prisma.seat.update({
        where: { id: seatId },
        data: {
          status: 'AVAILABLE',
          version: { increment: 1 },
        },
      });

      socketEmitter.emitSeatStatusChange(eventId, {
        seatIds: [seatId],
        status: 'AVAILABLE',
      });

      console.log(`[Seat Released] Seat ${seat.label} marked AVAILABLE (No waitlist entries).`);
      return false;
    }
  },

  /**
   * Validate token and claim waitlist offer, converting it to an active SeatHold
   */
  claimOffer: async (token: string, userId: string) => {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { offerToken: token },
      include: {
        event: { include: { venue: true } },
      },
    });

    if (!entry) {
      throw new AppError('Invalid or nonexistent waitlist claim token', 404);
    }

    if (entry.status !== 'OFFERED') {
      throw new AppError(`This offer is no longer valid (Current status: ${entry.status})`, 400);
    }

    if (entry.offerExpiresAt && new Date() > entry.offerExpiresAt) {
      throw new AppError('This waitlist offer has expired and been reallocated to the next customer', 410);
    }

    if (!entry.offeredSeatId) {
      throw new AppError('No seat attached to this offer', 400);
    }

    const seat = await prisma.seat.findUnique({
      where: { id: entry.offeredSeatId },
    });

    if (!seat || seat.status !== 'WAITLIST_RESERVED') {
      throw new AppError('Reserved seat is no longer held for this offer', 409);
    }

    // Mark waitlist entry as CLAIMED
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: 'CLAIMED' },
    });

    // Create an active SeatHold for this user
    const holdToken = generateSecureToken(24);
    const holdExpiresAt = new Date(Date.now() + ENV.HOLD_TTL_MINUTES * 60 * 1000);

    await prisma.seat.update({
      where: { id: seat.id },
      data: {
        status: 'HELD',
        version: { increment: 1 },
      },
    });

    const hold = await prisma.seatHold.create({
      data: {
        eventId: entry.eventId,
        seatId: seat.id,
        userId: userId || entry.userId,
        holdToken,
        expiresAt: holdExpiresAt,
      },
    });

    socketEmitter.emitSeatStatusChange(entry.eventId, {
      seatIds: [seat.id],
      status: 'HELD',
      heldByUserId: userId || entry.userId,
      expiresAt: holdExpiresAt,
    });

    return {
      holdToken,
      expiresAt: holdExpiresAt,
      seat,
      event: entry.event,
    };
  },

  /**
   * Get queue status for an event
   */
  getWaitlistStats: async (eventId: string) => {
    const counts = await prisma.waitlistEntry.groupBy({
      by: ['category', 'status'],
      where: { eventId },
      _count: { id: true },
    });

    return counts;
  },
};
