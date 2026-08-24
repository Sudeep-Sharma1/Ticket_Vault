import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Mail,
  ArrowRight,
  Ticket,
  Calendar,
  Sparkles,
  Printer,
  Copy,
} from 'lucide-react';
import { api } from '../services/api';
import { BookingDetail } from '../types';
import { TicketCard } from '../components/TicketCard';

export const BookingSuccessPage: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) return;
    const fetchBooking = async () => {
      try {
        const res = await api.getBookingByRef(reference);
        setBooking(res.booking);
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve booking confirmation');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [reference]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <p className="text-red-400 font-bold">{error || 'Booking reference not found'}</p>
        <Link to="/" className="mt-4 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Success Badge */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-50 duration-300">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
          TRANSACTION CONFIRMED
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white font-heading mt-1">
          You're Ready for the Show!
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-2">
          Your admission QR code has been generated and sent to{' '}
          <strong className="text-indigo-400">{booking.customerEmail}</strong>.
        </p>
      </div>

      {/* Ticket Pass Component */}
      <div className="mb-8">
        <TicketCard booking={booking} />
      </div>

      {/* Next Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/bookings"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700"
        >
          <Ticket className="w-4 h-4 text-indigo-400" />
          View in My Bookings
        </Link>
        <Link
          to="/"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <span>Explore More Events</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
