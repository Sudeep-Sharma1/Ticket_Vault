import { Router } from 'express';
import { authController } from '../controllers/authController';
import { venueController } from '../controllers/venueController';
import { eventController } from '../controllers/eventController';
import { seatController } from '../controllers/seatController';
import { bookingController } from '../controllers/bookingController';
import { waitlistController } from '../controllers/waitlistController';
import { adminController } from '../controllers/adminController';
import { authenticateToken, requireRole, optionalAuth } from '../middleware/auth';

const router = Router();

// ==========================================
// 1. Auth Routes
// ==========================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.me);

// ==========================================
// 2. Venue Routes (Admin / Public)
// ==========================================
router.get('/venues', venueController.getAllVenues);
router.get('/venues/:id', venueController.getVenueById);
router.post('/venues', authenticateToken, requireRole('ADMIN'), venueController.createVenue);
router.put('/venues/:id', authenticateToken, requireRole('ADMIN'), venueController.updateVenue);
router.delete('/venues/:id', authenticateToken, requireRole('ADMIN'), venueController.deleteVenue);

// ==========================================
// 3. Event Routes (Organiser / Public)
// ==========================================
router.get('/events', eventController.getAllEvents);
router.get('/events/:id', eventController.getEventById);
router.post('/events', authenticateToken, requireRole('ORGANISER', 'ADMIN'), eventController.createEvent);
router.put('/events/:id/status', authenticateToken, requireRole('ORGANISER', 'ADMIN'), eventController.updateEventStatus);
router.get('/organiser/dashboard', authenticateToken, requireRole('ORGANISER', 'ADMIN'), eventController.getOrganiserDashboard);

// ==========================================
// 4. Seat Map & Atomic Hold Routes
// ==========================================
router.get('/seats/event/:eventId', seatController.getEventSeatMap);
router.get('/seats/event/:eventId/best', seatController.findBestSeats);
router.post('/seats/hold', authenticateToken, seatController.holdSeats);
router.post('/seats/release', optionalAuth, seatController.releaseHold);
router.post('/seats/release-my-holds', authenticateToken, seatController.releaseMyEventHolds);
router.post('/seats/reset-event-holds/:eventId', seatController.resetEventHolds);
router.get('/seats/hold/:holdToken', seatController.getHoldDetails);

// ==========================================
// 5. Booking & Checkout Routes
// ==========================================
router.post('/bookings/checkout', authenticateToken, bookingController.checkout);
router.get('/bookings/ref/:reference', bookingController.getBookingByReference);
router.get('/bookings/my', authenticateToken, bookingController.getCustomerBookings);
router.post('/bookings/:id/cancel', authenticateToken, bookingController.cancelBooking);
router.post('/bookings/:id/transfer', authenticateToken, bookingController.transferBooking);

// ==========================================
// 6. Waitlist Routes
// ==========================================
router.post('/waitlist/join', authenticateToken, waitlistController.joinWaitlist);
router.get('/waitlist/offer/:token', waitlistController.getOfferDetails);
router.post('/waitlist/claim', authenticateToken, waitlistController.claimOffer);
router.get('/waitlist/my', authenticateToken, waitlistController.getUserWaitlists);

// ==========================================
// 7. Admin & Ticket Scanner Routes
// ==========================================
router.get('/admin/metrics', authenticateToken, requireRole('ADMIN'), adminController.getSystemMetrics);
router.post('/admin/verify-ticket', authenticateToken, requireRole('ORGANISER', 'ADMIN'), adminController.verifyTicket);
router.get('/emails/outbox', adminController.getEmailOutbox);

export default router;
