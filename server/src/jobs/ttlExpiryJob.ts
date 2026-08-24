import { prisma } from '../config/prisma';
import { waitlistService } from '../services/waitlistService';

let isRunning = false;

export const startTtlExpiryJob = (intervalMs: number = 4000) => {
  console.log(`[Job Scheduler] Starting Seat Hold & Waitlist TTL Expiry Worker (Interval: ${intervalMs}ms)...`);

  const runWorker = async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      const now = new Date();

      // ==========================================
      // 1. Process Expired Seat Holds
      // ==========================================
      const expiredHolds = await prisma.seatHold.findMany({
        where: {
          expiresAt: { lte: now },
          isExpired: false,
        },
        include: { seat: true },
        take: 50,
      });

      if (expiredHolds.length > 0) {
        console.log(`[TTL Expiry] Found ${expiredHolds.length} expired seat hold(s). Auto-releasing...`);

        // Mark as expired
        const holdIds = expiredHolds.map((h) => h.id);
        await prisma.seatHold.updateMany({
          where: { id: { in: holdIds } },
          data: { isExpired: true },
        });

        // Trigger waitlist allocation or make available
        for (const hold of expiredHolds) {
          if (hold.seat && hold.seat.status === 'HELD') {
            await waitlistService.assignNextInQueue(
              hold.eventId,
              hold.seatId,
              hold.seat.category
            );
          }
        }
      }

      // ==========================================
      // 2. Process Expired Waitlist Offers
      // ==========================================
      const expiredOffers = await prisma.waitlistEntry.findMany({
        where: {
          status: 'OFFERED',
          offerExpiresAt: { lte: now },
        },
        include: { event: true },
        take: 50,
      });

      if (expiredOffers.length > 0) {
        console.log(`[TTL Expiry] Found ${expiredOffers.length} expired waitlist offer(s). Reallocating to next in line...`);

        for (const offer of expiredOffers) {
          // Mark offer as expired
          await prisma.waitlistEntry.update({
            where: { id: offer.id },
            data: { status: 'EXPIRED' },
          });

          if (offer.offeredSeatId) {
            // Offer to next customer in FIFO queue or set to AVAILABLE
            await waitlistService.assignNextInQueue(
              offer.eventId,
              offer.offeredSeatId,
              offer.category
            );
          }
        }
      }
    } catch (err) {
      console.error('[TTL Expiry Worker Error]:', err);
    } finally {
      isRunning = false;
    }
  };

  // Run immediately and then on interval
  runWorker();
  const intervalId = setInterval(runWorker, intervalMs);

  return intervalId;
};
