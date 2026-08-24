import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'ticket-booking-jwt-secret-key-2026',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  HOLD_TTL_MINUTES: parseInt(process.env.HOLD_TTL_MINUTES || '10', 10),
  WAITLIST_OFFER_TTL_MINUTES: parseInt(process.env.WAITLIST_OFFER_TTL_MINUTES || '15', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || 'TicketBooking <tickets@ticketbooking.com>',
};
