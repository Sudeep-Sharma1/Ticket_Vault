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

      // Generate signed (tamper-proof) VaultPass QR Code
      const { qrDataString, qrDataUrl } = await generateTicketQRCode({
        ref: bookingReference,
        eventId: event.id,
        seats: seatLabels,
      });

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

  // Transfer a booking to another registered user.
  // A fresh signed VaultPass is issued to the recipient; the sender's old QR is revoked.
  transferBooking: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { recipientEmail } = req.body;
      const userId = req.user!.id;

      if (!recipientEmail || typeof recipientEmail !== 'string') {
        throw new AppError('Recipient email is required', 400);
      }

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: { items: true, event: true, user: true },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }
      if (booking.userId !== userId) {
        throw new AppError('Only the ticket holder can transfer this booking', 403);
      }
      if (booking.status !== 'CONFIRMED') {
        throw new AppError('Only confirmed bookings can be transferred', 400);
      }
      if (booking.checkInStatus === 'CHECKED_IN') {
        throw new AppError('This ticket has already been used for entry and cannot be transferred', 400);
      }
      if (new Date(booking.event.showTime) <= new Date()) {
        throw new AppError('Tickets cannot be transferred after the show has started', 400);
      }

      const recipient = await prisma.user.findUnique({
        where: { email: recipientEmail.trim().toLowerCase() },
      });
      if (!recipient) {
        throw new AppError('No TicketVault account found for that email. Ask them to register first.', 404);
      }
      if (recipient.id === userId) {
        throw new AppError('You already hold this ticket', 400);
      }

      const seatLabels = booking.items.map((i) => i.seatLabel);
      const { qrDataString, qrDataUrl } = await generateTicketQRCode({
        ref: booking.bookingReference,
        eventId: booking.eventId,
        seats: seatLabels,
      });

      // CAS update: fails if the ticket was scanned, cancelled or transferred concurrently
      const result = await prisma.booking.updateMany({
        where: {
          id,
          userId,
          status: 'CONFIRMED',
          checkInStatus: 'PENDING',
          qrCodeData: booking.qrCodeData,
        },
        data: {
          userId: recipient.id,
          customerName: recipient.name,
          customerEmail: recipient.email,
          customerPhone: recipient.phone,
          qrCodeData: qrDataString,
          qrCodeImage: qrDataUrl,
        },
      });

      if (result.count === 0) {
        throw new AppError('Ticket state changed during transfer. Please refresh and try again.', 409);
      }

      emailService.sendTicketTransfer({
        senderEmail: booking.user.email,
        senderName: booking.user.name,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        bookingReference: booking.bookingReference,
        eventTitle: booking.event.title,
        seats: seatLabels,
        qrCodeImage: qrDataUrl,
      }).catch((err) => console.error('[Transfer Email Error]:', err));

      res.json({
        message: `Ticket ${booking.bookingReference} transferred to ${recipient.name}. Your old QR pass is now revoked.`,
        bookingId: id,
        recipient: { name: recipient.name, email: recipient.email },
      });
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
