import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

export const adminController = {
  // System Overview Metrics
  getSystemMetrics: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const totalUsers = await prisma.user.count();
      const totalVenues = await prisma.venue.count();
      const totalEvents = await prisma.event.count();
      const totalBookings = await prisma.booking.count({ where: { status: 'CONFIRMED' } });
      const totalCancelled = await prisma.booking.count({ where: { status: 'CANCELLED' } });
      const totalWaitlistClaimed = await prisma.waitlistEntry.count({ where: { status: 'CLAIMED' } });

      const revenueSum = await prisma.booking.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { totalAmount: true },
      });

      res.json({
        metrics: {
          totalUsers,
          totalVenues,
          totalEvents,
          totalBookings,
          totalCancelled,
          totalWaitlistClaimed,
          totalRevenue: revenueSum._sum.totalAmount || 0,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // QR Code Ticket Verification & Entry Check-In
  verifyTicket: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bookingReference, qrPayload } = req.body;

      let ref = bookingReference;

      if (!ref && qrPayload) {
        try {
          const parsed = typeof qrPayload === 'string' ? JSON.parse(qrPayload) : qrPayload;
          ref = parsed.ref;
        } catch {
          ref = qrPayload;
        }
      }

      if (!ref) {
        throw new AppError('Booking reference or QR code data is required', 400);
      }

      const booking = await prisma.booking.findUnique({
        where: { bookingReference: ref },
        include: {
          items: true,
          event: { include: { venue: true } },
          user: { select: { name: true, email: true, phone: true } },
        },
      });

      if (!booking) {
        return res.status(404).json({
          status: 'INVALID',
          message: '❌ Invalid Ticket: No matching booking found.',
        });
      }

      if (booking.status === 'CANCELLED') {
        return res.status(400).json({
          status: 'CANCELLED',
          message: '🚫 Ticket Cancelled: This booking was cancelled/refunded.',
          booking,
        });
      }

      if (booking.checkInStatus === 'CHECKED_IN') {
        return res.status(400).json({
          status: 'ALREADY_CHECKED_IN',
          message: `⚠️ Ticket Already Used at ${new Date(booking.checkInTime!).toLocaleTimeString()}`,
          booking,
        });
      }

      // Check-in ticket
      const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          checkInStatus: 'CHECKED_IN',
          checkInTime: new Date(),
        },
        include: {
          items: true,
          event: { include: { venue: true } },
          user: { select: { name: true, email: true } },
        },
      });

      return res.json({
        status: 'VALID',
        message: '✅ Ticket Valid: Check-in Successful!',
        booking: updatedBooking,
      });
    } catch (err) {
      next(err);
    }
  },

  // In-App Email Outbox viewer for easy testing & demoing
  getEmailOutbox: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const emails = await prisma.emailLog.findMany({
        orderBy: { sentAt: 'desc' },
        take: 30,
      });

      res.json({ emails });
    } catch (err) {
      next(err);
    }
  },
};
