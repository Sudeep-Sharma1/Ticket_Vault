import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { LayoutConfig } from '../types';

/**
 * Smart Seat Finder — "best available" group seating.
 *
 * Every window of N adjacent AVAILABLE seats that does not straddle an aisle
 * is scored 0-100 on sightline quality:
 *   - horizontal: how close the group's centre is to the row centre (55%)
 *   - depth: how close the row is to the ideal viewing depth (45%)
 *     MOVIE   -> ~60% of the way back (cinema sightline sweet spot)
 *     CONCERT -> as close to the stage as possible
 * If no contiguous block exists, the best individual seats are returned
 * with contiguous=false so the UI can tell the customer they'll be split.
 */

const HORIZONTAL_WEIGHT = 55;
const DEPTH_WEIGHT = 45;
const MAX_SUGGESTIONS = 5;

const IDEAL_DEPTH: Record<string, number> = {
  MOVIE: 0.6,
  CONCERT: 0,
};

interface ScoredSeat {
  id: string;
  label: string;
  row: string;
  number: number;
  price: number;
  category: string;
}

export interface SeatSuggestion {
  seatIds: string[];
  labels: string[];
  score: number;
  contiguous: boolean;
  totalPrice: number;
}

export const seatFinderService = {
  findBestSeats: async (eventId: string, count: number, category?: string) => {
    if (!Number.isInteger(count) || count < 1 || count > 8) {
      throw new AppError('Seat count must be between 1 and 8', 400);
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: true },
    });
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const seats = await prisma.seat.findMany({
      where: { eventId, status: 'AVAILABLE', ...(category ? { category } : {}) },
      orderBy: [{ row: 'asc' }, { number: 'asc' }],
    });

    if (seats.length < count) {
      throw new AppError(
        `Only ${seats.length} ${category ? category + ' ' : ''}seat(s) available — not enough for ${count}.`,
        409
      );
    }

    const layout: LayoutConfig = JSON.parse(event.venue.layoutConfig || '{"rows":[]}');
    const rowOrder = layout.rows.length
      ? layout.rows.map((r) => r.label)
      : [...new Set(seats.map((s) => s.row))].sort();
    const rowMeta = new Map(layout.rows.map((r) => [r.label, r]));
    const idealDepth = IDEAL_DEPTH[event.category] ?? IDEAL_DEPTH.MOVIE;
    const maxDepthGap = Math.max(idealDepth, 1 - idealDepth);

    const rowSeatCount = (row: string, rowSeats: ScoredSeat[]) =>
      rowMeta.get(row)?.seatCount ?? Math.max(...rowSeats.map((s) => s.number));

    // Aisle block index: seats in the same block can sit together
    const blockOf = (row: string, num: number) =>
      (rowMeta.get(row)?.aisleAfter ?? []).filter((a) => a < num).length;

    const scoreGroup = (row: string, group: ScoredSeat[], seatsInRow: number) => {
      const centre = group.reduce((sum, s) => sum + s.number, 0) / group.length;
      const rowCentre = (seatsInRow + 1) / 2;
      const horizontal = Math.abs(centre - rowCentre) / Math.max(1, (seatsInRow - 1) / 2);
      const rowIdx = Math.max(0, rowOrder.indexOf(row));
      const depth = rowOrder.length > 1 ? rowIdx / (rowOrder.length - 1) : 0;
      const depthGap = Math.abs(depth - idealDepth) / maxDepthGap;
      return Math.max(0, Math.round(100 - HORIZONTAL_WEIGHT * horizontal - DEPTH_WEIGHT * depthGap));
    };

    const byRow = new Map<string, ScoredSeat[]>();
    for (const s of seats) {
      if (!byRow.has(s.row)) byRow.set(s.row, []);
      byRow.get(s.row)!.push(s);
    }

    // 1. Contiguous windows
    const windows: { group: ScoredSeat[]; score: number }[] = [];
    for (const [row, rowSeats] of byRow) {
      const seatsInRow = rowSeatCount(row, rowSeats);
      for (let i = 0; i + count <= rowSeats.length; i++) {
        const group = rowSeats.slice(i, i + count);
        const block = blockOf(row, group[0].number);
        const together = group.every(
          (s, j) => s.number === group[0].number + j && blockOf(row, s.number) === block
        );
        if (together) {
          windows.push({ group, score: scoreGroup(row, group, seatsInRow) });
        }
      }
    }

    const toSuggestion = (group: ScoredSeat[], score: number, contiguous: boolean): SeatSuggestion => ({
      seatIds: group.map((s) => s.id),
      labels: group.map((s) => s.label),
      score,
      contiguous,
      totalPrice: group.reduce((sum, s) => sum + s.price, 0),
    });

    if (windows.length > 0) {
      windows.sort((a, b) => b.score - a.score);
      // Pick non-overlapping alternatives so "try another" shows genuinely different blocks
      const used = new Set<string>();
      const suggestions: SeatSuggestion[] = [];
      for (const w of windows) {
        if (w.group.some((s) => used.has(s.id))) continue;
        w.group.forEach((s) => used.add(s.id));
        suggestions.push(toSuggestion(w.group, w.score, true));
        if (suggestions.length === MAX_SUGGESTIONS) break;
      }
      return { eventCategory: event.category, idealDepth, suggestions };
    }

    // 2. Fallback: best individual seats, party will be split
    const individual = seats
      .map((s) => ({ seat: s, score: scoreGroup(s.row, [s], rowSeatCount(s.row, byRow.get(s.row)!)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
    const avgScore = Math.round(individual.reduce((sum, x) => sum + x.score, 0) / individual.length);

    return {
      eventCategory: event.category,
      idealDepth,
      suggestions: [toSuggestion(individual.map((x) => x.seat), avgScore, false)],
    };
  },
};
