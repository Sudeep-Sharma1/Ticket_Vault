import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { holdService } from '../services/holdService';
import { seatFinderService } from '../services/seatFinderService';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export const seatController = {
  // Get Visual Seat Grid Map for an Event
  getEventSeatMap: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { venue: true },
      });

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      // Fetch all seats ordered by row and number
      const seats = await prisma.seat.findMany({
        where: { eventId },
        orderBy: [{ row: 'asc' }, { number: 'asc' }],
      });

      // Also fetch active holds to attach user hold info
      const activeHolds = await prisma.seatHold.findMany({
        where: {
          eventId,
          isExpired: false,
          expiresAt: { gt: new Date() },
        },
        select: {
          seatId: true,
          userId: true,
          expiresAt: true,
          holdToken: true,
        },
      });

      const holdMap = new Map(activeHolds.map((h) => [h.seatId, h]));

      // Group seats by row for clean visual rendering
      const rowMap: Record<string, any[]> = {};
      seats.forEach((seat) => {
        if (!rowMap[seat.row]) {
          rowMap[seat.row] = [];
        }
        const hold = holdMap.get(seat.id);
        rowMap[seat.row].push({
          ...seat,
          heldByUserId: hold ? hold.userId : undefined,
          holdExpiresAt: hold ? hold.expiresAt : undefined,
        });
      });

      const layoutConfig = JSON.parse(event.venue.layoutConfig || '{"rows":[]}');

      res.json({
        eventId,
        eventTitle: event.title,
        venueName: event.venue.name,
        holdTtlMinutes: event.holdTtlMinutes,
        layoutConfig,
        seats,
        seatGrid: rowMap,
      });
    } catch (err) {
      next(err);
    }
  },

  // Smart Seat Finder: best-scored group of adjacent available seats
  findBestSeats: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      const count = parseInt(String(req.query.count ?? '2'), 10);
      const category = typeof req.query.category === 'string' && req.query.category !== 'ANY'
        ? req.query.category
        : undefined;

      const result = await seatFinderService.findBestSeats(eventId, count, category);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // Atomic Concurrency-protected Seat Hold
  holdSeats: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { eventId, seatIds } = req.body;
      const userId = req.user!.id;

      if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0) {
        throw new AppError('Event ID and array of seat IDs are required', 400);
      }

      const result = await holdService.holdSeats(eventId, seatIds, userId);

      res.json({
        message: 'Seats held successfully. Please complete checkout before expiry.',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  // Release Held Seats on Checkout Abandonment / Navigation
  releaseHold: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { holdToken } = req.body;

      if (!holdToken) {
        throw new AppError('Hold token is required', 400);
      }

      const result = await holdService.releaseHold(holdToken, req.user?.id);

      res.json({
        message: 'Held seats released successfully',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  // Release all active holds for current user on this event
  releaseMyEventHolds: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.body;
      const userId = req.user!.id;

      if (!eventId) {
        throw new AppError('Event ID is required', 400);
      }

      const result = await holdService.releaseUserEventHolds(eventId, userId);

      res.json({
        message: 'Your active holds for this event have been released.',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  // Reset all held seats for an event (Testing & Demo utility)
  resetEventHolds: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;

      const result = await holdService.resetEventHolds(eventId);

      res.json({
        message: 'All held seats for this event have been released back to Available.',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  // Get active hold details
  getHoldDetails: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { holdToken } = req.params;
      const details = await holdService.getHoldDetails(holdToken);
      res.json(details);
    } catch (err) {
      next(err);
    }
  },
};
