export type UserRole = 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
export type EventCategory = 'MOVIE' | 'CONCERT';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'SOLD_OUT' | 'CANCELLED' | 'COMPLETED';
export type SeatCategory = 'VIP' | 'PREMIUM' | 'STANDARD';
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'WAITLIST_RESERVED';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
export type CheckInStatus = 'PENDING' | 'CHECKED_IN';
export type WaitlistStatus = 'WAITING' | 'OFFERED' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface VenueRowLayout {
  label: string;
  category: SeatCategory;
  seatCount: number;
  aisleAfter?: number[];
}

export interface VenueLayoutConfig {
  rows: VenueRowLayout[];
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  totalCapacity: number;
  layoutConfig: VenueLayoutConfig;
  createdAt: string;
}

export interface TierPricing {
  VIP?: number;
  PREMIUM?: number;
  STANDARD?: number;
  [key: string]: number | undefined;
}

export interface EventStats {
  totalSeats: number;
  availableSeats: number;
  heldSeats: number;
  bookedSeats: number;
  isSoldOut: boolean;
  waitlistCounts?: Record<string, number>;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  bannerUrl?: string;
  durationMinutes: number;
  venueId: string;
  venue: Venue;
  organiserId: string;
  organiser?: { id: string; name: string; email: string };
  showTime: string;
  status: EventStatus;
  tierPricing: TierPricing;
  holdTtlMinutes: number;
  stats?: EventStats;
  createdAt: string;
}

export interface SeatItem {
  id: string;
  eventId: string;
  row: string;
  number: number;
  label: string;
  category: SeatCategory;
  price: number;
  status: SeatStatus;
  heldByUserId?: string;
  holdExpiresAt?: string;
}

export interface BookingItemDetail {
  id: string;
  seatId: string;
  seatLabel: string;
  category: SeatCategory;
  price: number;
}

export interface BookingDetail {
  id: string;
  bookingReference: string;
  eventId: string;
  event: EventItem;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  totalAmount: number;
  status: BookingStatus;
  qrCodeData: string;
  qrCodeImage: string;
  checkInStatus: CheckInStatus;
  checkInTime?: string;
  items: BookingItemDetail[];
  createdAt: string;
}

export interface WaitlistEntryItem {
  id: string;
  eventId: string;
  event: EventItem;
  category: SeatCategory;
  status: WaitlistStatus;
  position: number;
  offerToken?: string;
  offerExpiresAt?: string;
  createdAt: string;
}

export interface EmailLogItem {
  id: string;
  recipientEmail: string;
  subject: string;
  type: string;
  previewUrl?: string;
  htmlContent: string;
  sentAt: string;
}
