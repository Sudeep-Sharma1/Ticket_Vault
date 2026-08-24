import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { generateBookingReference } from '../utils/crypto';
import { generateTicketQRCode } from '../services/qrService';
import { emailService } from '../services/emailService';
import { socketEmitter } from '../services/socketService';
import { waitlistService } from '../services/waitlistService';

export const bookingController = {
  // Complete Booking / Checkout
  checkout: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { holdToken, customerName, customerEmail, customerPhone } = req.body;
      const userId = req.user!.id;

      if (!holdToken || !customerName || !customerEmail) {
        throw new AppError('Hold token, customer name, and customer email are required', 400);
      }

      // Fetch active holds
      const holds = await prisma.seatHold.findMany({
        where: {
          holdToken,
          isExpired: false,
          expiresAt: { gt: new Date() },
        },
        include: {
          seat: true,
          event: { include: { venue: true } },
        },
      });

      if (holds.length === 0) {
        throw new AppError('Your seat hold session has expired or is invalid. Please select seats again.', 410);
      }

      const event = holds[0].event;
      const seats = holds.map((h) => h.seat);
      const totalAmount = seats.reduce((sum, s) => sum + s.price, 0);
      const seatLabels = seats.map((s) => s.label);
      const seatIds = seats.map((s) => s.id);

      const bookingReference = generateBookingReference();

      // Generate Scannable QR Code
      const qrPayload = {
        ref: bookingReference,
        eventId: event.id,
        eventTitle: event.title,
        seats: seatLabels,
        customerEmail,
        issuedAt: new Date().toISOString(),
      };

      const { qrDataString, qrDataUrl } = await generateTicketQRCode(qrPayload);

      // Perform atomic checkout transaction
      const booking = await prisma.$transaction(async (tx) => {
        // 1. Mark seats as BOOKED
        await tx.seat.updateMany({
          where: { id: { in: seatIds } },
          data: {
            status: 'BOOKED',
            version: { increment: 1 },
          },
        });

        // 2. Mark holds as expired / consumed
        await tx.seatHold.updateMany({
          where: { holdToken },
          data: { isExpired: true },
        });

        // 3. Create Booking record
        const newBooking = await tx.booking.create({
          data: {
            bookingReference,
            eventId: event.id,
            userId,
            customerName,
            customerEmail,
            customerPhone: customerPhone || null,
            totalAmount,
            status: 'CONFIRMED',
            qrCodeData: qrDataString,
            qrCodeImage: qrDataUrl,
            items: {
              create: seats.map((s) => ({
                seatId: s.id,
                seatLabel: s.label,
                category: s.category as any,
                price: s.price,
              })),
            },
          },
          include: {
            items: true,
            event: { include: { venue: true } },
          },
        });

        return newBooking;
      });

      // 4. Broadcast real-time seat status update to everyone watching seat map
      socketEmitter.emitSeatStatusChange(event.id, {
        seatIds,
        status: 'BOOKED',
      });

      // 5. Send confirmation email with embedded QR code
      emailService.sendBookingConfirmation({
        recipientEmail: customerEmail,
        customerName,
        bookingReference,
        eventTitle: event.title,
        showTime: event.showTime,
        venueName: event.venue.name,
        seats: seatLabels,
        totalAmount,
        qrCodeImage: qrDataUrl,
      }).catch((err) => console.error('[Email Dispatch Error]:', err));

      res.status(201).json({
        message: 'Booking confirmed successfully! Confirmation email with QR ticket sent.',
        booking,
      });
    } catch (err) {
      next(err);
    }
  },

  // Get Booking by Reference
  getBookingByReference: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reference } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { bookingReference: reference },
        include: {
          items: true,
          event: {
            include: { venue: true, organiser: { select: { name: true, email: true } } },
          },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      res.json({ booking });
    } catch (err) {
      next(err);
    }
  },

  // Get current logged-in customer's booking history
  getCustomerBookings: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const bookings = await prisma.booking.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          event: {
            include: { venue: true },
          },
        },
      });

      res.json({ bookings });
    } catch (err) {
      next(err);
    }
  },

  // Cancel Booking & Reallocate seats to Waitlist
  cancelBooking: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          items: { include: { seat: true } },
          event: true,
        },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      if (booking.userId !== userId && !isAdmin) {
        throw new AppError('You are not authorized to cancel this booking', 403);
      }

      if (booking.status === 'CANCELLED') {
        throw new AppError('This booking is already cancelled', 400);
      }

      // 1. Update booking status
      await prisma.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // 2. Reallocate each seat to waitlist queue or mark as AVAILABLE
      for (const item of booking.items) {
        await waitlistService.assignNextInQueue(
          booking.eventId,
          item.seatId,
          item.category
        );
      }

      // 3. Send cancellation email
      emailService.sendCancellationNotice({
        recipientEmail: booking.customerEmail,
        customerName: booking.customerName,
        bookingReference: booking.bookingReference,
        eventTitle: booking.event.title,
        refundAmount: booking.totalAmount,
      }).catch((err) => console.error('[Cancellation Email Error]:', err));

      res.json({
        message: 'Booking cancelled successfully. Seats have been reallocated to waitlisted customers.',
        bookingId: id,
        refundAmount: booking.totalAmount,
      });
    } catch (err) {
      next(err);
    }
  },
};
