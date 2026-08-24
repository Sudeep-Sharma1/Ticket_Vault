import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { waitlistService } from '../services/waitlistService';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export const waitlistController = {
  // Join Waitlist
  joinWaitlist: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { eventId, category } = req.body;
      const userId = req.user!.id;

      if (!eventId || !category) {
        throw new AppError('Event ID and seat category are required', 400);
      }

      const entry = await waitlistService.joinWaitlist(eventId, userId, category);

      res.status(201).json({
        message: `Successfully joined waitlist for ${category} category! Position: #${entry.position}`,
        entry,
      });
    } catch (err) {
      next(err);
    }
  },

  // Get Waitlist Offer Details by Token
  getOfferDetails: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;

      const entry = await prisma.waitlistEntry.findUnique({
        where: { offerToken: token },
        include: {
          event: { include: { venue: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (!entry) {
        throw new AppError('Waitlist offer token not found', 404);
      }

      let offeredSeat = null;
      if (entry.offeredSeatId) {
        offeredSeat = await prisma.seat.findUnique({
          where: { id: entry.offeredSeatId },
        });
      }

      const isExpired = entry.offerExpiresAt ? new Date() > entry.offerExpiresAt : true;

      res.json({
        offer: {
          id: entry.id,
          status: entry.status,
          category: entry.category,
          expiresAt: entry.offerExpiresAt,
          isExpired,
          event: entry.event,
          seat: offeredSeat,
          user: entry.user,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Claim Time-Limited Waitlist Offer
  claimOffer: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      const userId = req.user!.id;

      if (!token) {
        throw new AppError('Offer token is required', 400);
      }

      const result = await waitlistService.claimOffer(token, userId);

      res.json({
        message: 'Waitlist offer claimed successfully! Seat is now held for you. Please complete checkout.',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  // Get user's active waitlists
  getUserWaitlists: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const entries = await prisma.waitlistEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          event: { include: { venue: true } },
        },
      });

      res.json({ waitlists: entries });
    } catch (err) {
      next(err);
    }
  },
};
