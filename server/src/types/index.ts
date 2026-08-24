import { Request } from 'express';

export type Role = 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
export type SeatCategory = 'VIP' | 'PREMIUM' | 'STANDARD';
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'WAITLIST_RESERVED';
export type EventCategory = 'MOVIE' | 'CONCERT';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'SOLD_OUT' | 'CANCELLED' | 'COMPLETED';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
export type CheckInStatus = 'PENDING' | 'CHECKED_IN';
export type WaitlistStatus = 'WAITING' | 'OFFERED' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface LayoutConfig {
  rows: {
    label: string; // e.g. "A", "B", "C"
    category: SeatCategory;
    seatCount: number;
    aisleAfter?: number[]; // Seat numbers after which there is an aisle gap
  }[];
}

export interface TierPricing {
  VIP?: number;
  PREMIUM?: number;
  STANDARD?: number;
  [key: string]: number | undefined;
}

export interface SeatHoldPayload {
  eventId: string;
  seatIds: string[];
}

export interface CheckoutPayload {
  holdToken: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  paymentMethod?: string;
}

export interface WaitlistJoinPayload {
  eventId: string;
  category: SeatCategory;
}
