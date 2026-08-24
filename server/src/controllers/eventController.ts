import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest, LayoutConfig, TierPricing } from '../types';
import { socketEmitter } from '../services/socketService';

export const eventController = {
  // Public: Browse and search events with filters
  getAllEvents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, search, venueId, status } = req.query;

      const whereClause: any = {};

      if (category && (category === 'MOVIE' || category === 'CONCERT')) {
        whereClause.category = category;
      }

      if (venueId && typeof venueId === 'string') {
        whereClause.venueId = venueId;
      }

      if (status && typeof status === 'string') {
        whereClause.status = status;
      } else {
        // Default only show published/sold-out events to customers
        whereClause.status = { in: ['PUBLISHED', 'SOLD_OUT'] };
      }

      if (search && typeof search === 'string') {
        whereClause.OR = [
          { title: { contains: search } },
          { description: { contains: search } },
        ];
      }

      const events = await prisma.event.findMany({
        where: whereClause,
        orderBy: { showTime: 'asc' },
        include: {
          venue: { select: { id: true, name: true, city: true, address: true } },
          organiser: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              seats: true,
              bookings: true,
              waitlistEntries: true,
            },
          },
        },
      });

      // Calculate availability counts per event
      const eventsWithStats = await Promise.all(
        events.map(async (ev) => {
          const availableSeatsCount = await prisma.seat.count({
            where: { eventId: ev.id, status: 'AVAILABLE' },
          });
          const heldSeatsCount = await prisma.seat.count({
            where: { eventId: ev.id, status: 'HELD' },
          });
          const bookedSeatsCount = await prisma.seat.count({
            where: { eventId: ev.id, status: 'BOOKED' },
          });

          return {
            ...ev,
            tierPricing: JSON.parse(ev.tierPricing || '{}'),
            stats: {
              totalSeats: ev._count.seats,
              availableSeats: availableSeatsCount,
              heldSeats: heldSeatsCount,
              bookedSeats: bookedSeatsCount,
              isSoldOut: availableSeatsCount === 0 && heldSeatsCount === 0,
            },
          };
        })
      );

      res.json({ events: eventsWithStats });
    } catch (err) {
      next(err);
    }
  },

  // Public: Get single event with seat layout & pricing details
  getEventById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          venue: true,
          organiser: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              seats: true,
              bookings: true,
              waitlistEntries: true,
            },
          },
        },
      });

      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const availableSeatsCount = await prisma.seat.count({
        where: { eventId: id, status: 'AVAILABLE' },
      });
      const heldSeatsCount = await prisma.seat.count({
        where: { eventId: id, status: 'HELD' },
      });
      const bookedSeatsCount = await prisma.seat.count({
        where: { eventId: id, status: 'BOOKED' },
      });

      // Waitlist count per category
      const waitlistStats = await prisma.waitlistEntry.groupBy({
        by: ['category'],
        where: { eventId: id, status: 'WAITING' },
        _count: { id: true },
      });

      const waitlistByCategory: Record<string, number> = {};
      waitlistStats.forEach((w) => {
        waitlistByCategory[w.category] = w._count.id;
      });

      res.json({
        event: {
          ...event,
          tierPricing: JSON.parse(event.tierPricing || '{}'),
          venue: {
            ...event.venue,
            layoutConfig: JSON.parse(event.venue.layoutConfig || '{"rows":[]}'),
          },
          stats: {
            totalSeats: event._count.seats,
            availableSeats: availableSeatsCount,
            heldSeats: heldSeatsCount,
            bookedSeats: bookedSeatsCount,
            isSoldOut: availableSeatsCount === 0 && heldSeatsCount === 0,
            waitlistCounts: waitlistByCategory,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Organiser / Admin: Create new Event + Generate Venue Seats
  createEvent: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        title,
        description,
        category,
        bannerUrl,
        durationMinutes,
        venueId,
        showTime,
        tierPricing,
        holdTtlMinutes,
      } = req.body;

      if (!title || !venueId || !showTime || !tierPricing) {
        throw new AppError('Title, venue, show time, and tier pricing are required', 400);
      }

      const venue = await prisma.venue.findUnique({
        where: { id: venueId },
      });

      if (!venue) {
        throw new AppError('Venue not found', 404);
      }

      const layout: LayoutConfig = JSON.parse(venue.layoutConfig || '{"rows":[]}');
      if (!layout.rows || layout.rows.length === 0) {
        throw new AppError('The selected venue has no seating rows configured', 400);
      }

      const pricing: TierPricing = tierPricing;

      // Create Event record
      const event = await prisma.event.create({
        data: {
          title,
          description: description || '',
          category: category === 'CONCERT' ? 'CONCERT' : 'MOVIE',
          bannerUrl: bannerUrl || null,
          durationMinutes: parseInt(durationMinutes || '120', 10),
          venueId,
          organiserId: req.user!.id,
          showTime: new Date(showTime),
          status: 'PUBLISHED',
          tierPricing: JSON.stringify(pricing),
          holdTtlMinutes: parseInt(holdTtlMinutes || '10', 10),
        },
      });

      // Generate all seat rows based on venue layout
      const seatCreateInputs: any[] = [];

      for (const rowConfig of layout.rows) {
        const rowLabel = rowConfig.label;
        const rowCategory = rowConfig.category || 'STANDARD';
        const price = pricing[rowCategory] || pricing.STANDARD || 20;

        for (let num = 1; num <= rowConfig.seatCount; num++) {
          seatCreateInputs.push({
            eventId: event.id,
            row: rowLabel,
            number: num,
            label: `${rowLabel}-${num}`,
            category: rowCategory,
            price: Number(price),
            status: 'AVAILABLE',
            version: 1,
          });
        }
      }

      // Batch insert seats
      await prisma.seat.createMany({
        data: seatCreateInputs,
      });

      res.status(201).json({
        message: 'Event and seat map created successfully',
        event: {
          ...event,
          tierPricing: pricing,
          totalSeatsGenerated: seatCreateInputs.length,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Organiser Dashboard: Analytics and Revenue per event
  getOrganiserDashboard: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const events = await prisma.event.findMany({
        where: isAdmin ? {} : { organiserId },
        orderBy: { showTime: 'desc' },
        include: {
          venue: true,
          bookings: {
            where: { status: 'CONFIRMED' },
            include: { items: true },
          },
          _count: {
            select: {
              seats: true,
              waitlistEntries: true,
            },
          },
        },
      });

      let totalRevenue = 0;
      let totalTicketsSold = 0;
      let totalEvents = events.length;

      const eventSummaries = await Promise.all(
        events.map(async (ev) => {
          const confirmedBookings = ev.bookings;
          const eventRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
          const eventTicketsSold = confirmedBookings.reduce((sum, b) => sum + b.items.length, 0);

          totalRevenue += eventRevenue;
          totalTicketsSold += eventTicketsSold;

          const availableSeatsCount = await prisma.seat.count({
            where: { eventId: ev.id, status: 'AVAILABLE' },
          });
          const heldSeatsCount = await prisma.seat.count({
            where: { eventId: ev.id, status: 'HELD' },
          });

          // Waitlist count
          const waitingCount = await prisma.waitlistEntry.count({
            where: { eventId: ev.id, status: 'WAITING' },
          });

          // Cancellation count
          const cancelledCount = await prisma.booking.count({
            where: { eventId: ev.id, status: 'CANCELLED' },
          });

          return {
            id: ev.id,
            title: ev.title,
            category: ev.category,
            showTime: ev.showTime,
            venueName: ev.venue.name,
            status: ev.status,
            totalSeats: ev._count.seats,
            availableSeats: availableSeatsCount,
            heldSeats: heldSeatsCount,
            ticketsSold: eventTicketsSold,
            occupancyRate: ev._count.seats > 0 ? (eventTicketsSold / ev._count.seats) * 100 : 0,
            revenue: eventRevenue,
            waitingListCount: waitingCount,
            cancellationsCount: cancelledCount,
            tierPricing: JSON.parse(ev.tierPricing || '{}'),
          };
        })
      );

      res.json({
        metrics: {
          totalEvents,
          totalRevenue,
          totalTicketsSold,
        },
        events: eventSummaries,
      });
    } catch (err) {
      next(err);
    }
  },

  // Update Event Status
  updateEventStatus: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const event = await prisma.event.update({
        where: { id },
        data: { status },
      });

      socketEmitter.emitEventStatusChange(id, status);

      res.json({ message: 'Event status updated', event });
    } catch (err) {
      next(err);
    }
  },
};
