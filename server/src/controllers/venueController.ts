import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { LayoutConfig } from '../types';

export const venueController = {
  // Public / Organiser: Get all venues
  getAllVenues: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venues = await prisma.venue.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { events: true } },
        },
      });

      const parsedVenues = venues.map((v) => ({
        ...v,
        layoutConfig: JSON.parse(v.layoutConfig || '{"rows":[]}'),
      }));

      res.json({ venues: parsedVenues });
    } catch (err) {
      next(err);
    }
  },

  // Get single venue
  getVenueById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const venue = await prisma.venue.findUnique({
        where: { id },
      });

      if (!venue) {
        throw new AppError('Venue not found', 404);
      }

      res.json({
        venue: {
          ...venue,
          layoutConfig: JSON.parse(venue.layoutConfig || '{"rows":[]}'),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Admin: Create new venue
  createVenue: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, address, city, layoutConfig } = req.body;

      if (!name || !layoutConfig || !Array.isArray(layoutConfig.rows)) {
        throw new AppError('Venue name and valid layout rows are required', 400);
      }

      // Calculate total capacity from layout
      const totalCapacity = layoutConfig.rows.reduce(
        (sum: number, r: any) => sum + (r.seatCount || 0),
        0
      );

      const venue = await prisma.venue.create({
        data: {
          name,
          address: address || '',
          city: city || '',
          totalCapacity,
          layoutConfig: JSON.stringify(layoutConfig),
        },
      });

      res.status(201).json({
        message: 'Venue created successfully',
        venue: {
          ...venue,
          layoutConfig,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Admin: Update venue
  updateVenue: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, address, city, layoutConfig } = req.body;

      let totalCapacity: number | undefined = undefined;
      let layoutConfigStr: string | undefined = undefined;

      if (layoutConfig && Array.isArray(layoutConfig.rows)) {
        totalCapacity = layoutConfig.rows.reduce(
          (sum: number, r: any) => sum + (r.seatCount || 0),
          0
        );
        layoutConfigStr = JSON.stringify(layoutConfig);
      }

      const venue = await prisma.venue.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(address !== undefined ? { address } : {}),
          ...(city !== undefined ? { city } : {}),
          ...(totalCapacity !== undefined ? { totalCapacity } : {}),
          ...(layoutConfigStr !== undefined ? { layoutConfig: layoutConfigStr } : {}),
        },
      });

      res.json({
        message: 'Venue updated successfully',
        venue: {
          ...venue,
          layoutConfig: JSON.parse(venue.layoutConfig),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Admin: Delete venue
  deleteVenue: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await prisma.venue.delete({
        where: { id },
      });

      res.json({ message: 'Venue deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
};
