import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { isVaultPassToken, verifyVaultPass } from '../utils/ticketSignature';

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
  // Signed VaultPass tokens are verified cryptographically; a typed booking
  // reference is accepted as a staff-assisted manual lookup.
  verifyTicket: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bookingReference, qrPayload } = req.body;
      const scanned = typeof qrPayload === 'string' ? qrPayload.trim() : '';

      let ref: string | undefined;
      let method: 'SIGNED_QR' | 'MANUAL_REFERENCE';

      if (isVaultPassToken(scanned)) {
        const verification = verifyVaultPass(scanned);
        if (!verification.valid) {
          return res.status(400).json({
            status: 'FORGED',
            message:
              verification.reason === 'BAD_SIGNATURE'
                ? '🛑 Forged Ticket: QR signature does not match. This pass was not issued by TicketVault or has been edited.'
                : '🛑 Unreadable Ticket: QR data is malformed.',
          });
        }
        ref = verification.claims.ref;
        method = 'SIGNED_QR';
      } else if (typeof bookingReference === 'string' && bookingReference.trim()) {
        ref = bookingReference.trim().toUpperCase();
        method = 'MANUAL_REFERENCE';
      } else if (scanned) {
        return res.status(400).json({
          status: 'FORGED',
          message: '🛑 Unsigned Ticket: This QR is not a signed VaultPass and cannot be admitted.',
        });
      } else {
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

      // A genuine signature over an outdated token means the pass was re-issued
      // (e.g. transferred to someone else) and this copy is no longer valid.
      if (method === 'SIGNED_QR' && booking.qrCodeData !== scanned) {
        return res.status(400).json({
          status: 'REVOKED',
          message: '🔁 Revoked Pass: This QR was superseded (ticket transferred or re-issued). Ask the holder for their current pass.',
        });
      }

      // Atomic CAS check-in: only one of several simultaneous scans can flip PENDING -> CHECKED_IN
      const checkIn = await prisma.booking.updateMany({
        where: { id: booking.id, checkInStatus: 'PENDING' },
        data: {
          checkInStatus: 'CHECKED_IN',
          checkInTime: new Date(),
        },
      });

      if (checkIn.count === 0) {
        const current = await prisma.booking.findUnique({ where: { id: booking.id } });
        return res.status(400).json({
          status: 'ALREADY_CHECKED_IN',
          message: `⚠️ Ticket Already Used at ${new Date(current!.checkInTime!).toLocaleTimeString()}`,
          booking,
        });
      }

      const updatedBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: {
          items: true,
          event: { include: { venue: true } },
          user: { select: { name: true, email: true } },
        },
      });

      return res.json({
        status: 'VALID',
        method,
        message:
          method === 'SIGNED_QR'
            ? '✅ Ticket Valid: Signature verified, check-in successful!'
            : '✅ Manual Check-in: Reference matched (no QR signature checked).',
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
