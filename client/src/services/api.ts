const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const request = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = localStorage.getItem('ticket_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data as T;
};

export const api = {
  // Auth
  register: (body: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),

  // Venues
  getVenues: () => request('/venues'),
  getVenue: (id: string) => request(`/venues/${id}`),
  createVenue: (body: any) => request('/venues', { method: 'POST', body: JSON.stringify(body) }),
  updateVenue: (id: string, body: any) => request(`/venues/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVenue: (id: string) => request(`/venues/${id}`, { method: 'DELETE' }),

  // Events
  getEvents: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request(`/events${query}`);
  },
  getEvent: (id: string) => request(`/events/${id}`),
  createEvent: (body: any) => request('/events', { method: 'POST', body: JSON.stringify(body) }),
  updateEventStatus: (id: string, status: string) =>
    request(`/events/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getOrganiserDashboard: () => request('/organiser/dashboard'),

  // Seats & Holds
  getSeatMap: (eventId: string) => request(`/seats/event/${eventId}`),
  findBestSeats: (eventId: string, count: number, category: string) =>
    request(`/seats/event/${eventId}/best?${new URLSearchParams({ count: String(count), category })}`),
  holdSeats: (eventId: string, seatIds: string[]) =>
    request('/seats/hold', { method: 'POST', body: JSON.stringify({ eventId, seatIds }) }),
  releaseHold: (holdToken: string) =>
    request('/seats/release', { method: 'POST', body: JSON.stringify({ holdToken }) }),
  releaseMyEventHolds: (eventId: string) =>
    request('/seats/release-my-holds', { method: 'POST', body: JSON.stringify({ eventId }) }),
  resetEventHolds: (eventId: string) =>
    request(`/seats/reset-event-holds/${eventId}`, { method: 'POST' }),
  getHoldDetails: (holdToken: string) => request(`/seats/hold/${holdToken}`),

  // Bookings & Checkout
  checkout: (body: any) => request('/bookings/checkout', { method: 'POST', body: JSON.stringify(body) }),
  getBookingByRef: (ref: string) => request(`/bookings/ref/${ref}`),
  getMyBookings: () => request('/bookings/my'),
  cancelBooking: (id: string) => request(`/bookings/${id}/cancel`, { method: 'POST' }),
  transferBooking: (id: string, recipientEmail: string) =>
    request(`/bookings/${id}/transfer`, { method: 'POST', body: JSON.stringify({ recipientEmail }) }),

  // Waitlist
  joinWaitlist: (eventId: string, category: string) =>
    request('/waitlist/join', { method: 'POST', body: JSON.stringify({ eventId, category }) }),
  getOfferDetails: (token: string) => request(`/waitlist/offer/${token}`),
  claimOffer: (token: string) =>
    request('/waitlist/claim', { method: 'POST', body: JSON.stringify({ token }) }),
  getMyWaitlists: () => request('/waitlist/my'),

  // Admin & Email Outbox
  getAdminMetrics: () => request('/admin/metrics'),
  verifyTicket: (body: { bookingReference?: string; qrPayload?: string }) =>
    request('/admin/verify-ticket', { method: 'POST', body: JSON.stringify(body) }),
  getEmailOutbox: () => request('/emails/outbox'),
};
