import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Calendar,
  MapPin,
  Flame,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Send,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BookingDetail, WaitlistEntryItem } from '../types';
import { TicketCard } from '../components/TicketCard';
import { Modal } from '../components/Modal';

export const CustomerBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'BOOKINGS' | 'WAITLIST'>('BOOKINGS');
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [waitlists, setWaitlists] = useState<WaitlistEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<BookingDetail | null>(null);

  // Cancellation State
  const [cancellingBooking, setCancellingBooking] = useState<BookingDetail | null>(null);
  const [cancellingLoading, setCancellingLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Transfer State
  const [transferringBooking, setTransferringBooking] = useState<BookingDetail | null>(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, waitlistsRes] = await Promise.all([
        api.getMyBookings(),
        api.getMyWaitlists(),
      ]);
      setBookings(bookingsRes.bookings || []);
      setWaitlists(waitlistsRes.waitlists || []);
    } catch (err) {
      console.error('Failed to load user booking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return;
    setCancellingLoading(true);
    try {
      const res = await api.cancelBooking(cancellingBooking.id);
      setActionMessage(
        `Booking ${cancellingBooking.bookingReference} cancelled. Seats were automatically offered to the waitlist!`
      );
      setCancellingBooking(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancellingLoading(false);
    }
  };

  const closeTransfer = () => {
    setTransferringBooking(null);
    setTransferEmail('');
    setTransferError(null);
  };

  const handleTransferBooking = async () => {
    if (!transferringBooking || !transferEmail.trim()) return;
    setTransferLoading(true);
    setTransferError(null);
    try {
      const res = await api.transferBooking(transferringBooking.id, transferEmail.trim());
      setActionMessage(res.message);
      closeTransfer();
      fetchData();
    } catch (err: any) {
      setTransferError(err.message || 'Failed to transfer ticket');
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white font-heading tracking-tight">
            My Tickets & Reservations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your booked passes, cancellations, and priority waitlist queues.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('BOOKINGS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'BOOKINGS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Active Tickets ({bookings.filter((b) => b.status === 'CONFIRMED').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('WAITLIST')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'WAITLIST'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-purple-400" />
            <span>Waitlists ({waitlists.length})</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: CONFIRMED BOOKINGS */}
      {activeTab === 'BOOKINGS' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="py-20 text-center glass-panel rounded-3xl">
              <Ticket className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-300 font-semibold">No bookings yet</p>
              <Link
                to="/"
                className="mt-4 inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
              >
                Browse Upcoming Events
              </Link>
            </div>
          ) : (
            bookings.map((b) => {
              const isCancelled = b.status === 'CANCELLED';
              const showDate = new Date(b.event.showTime).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={b.id}
                  className={`glass-panel p-6 rounded-3xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                    isCancelled ? 'border-red-900/30 opacity-60' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-900 to-slate-900 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                      <Ticket className="w-6 h-6 text-indigo-400" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-xs text-cyan-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                          {b.bookingReference}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            isCancelled
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white font-heading">{b.event.title}</h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {showDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {b.event.venue.name}
                        </span>
                        <span>
                          Seats:{' '}
                          <strong className="text-white font-mono">
                            {b.items.map((i) => i.seatLabel).join(', ')}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 uppercase block">Total</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        ₹{b.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {!isCancelled && (
                        <>
                          <button
                            onClick={() => setSelectedTicket(b)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-500/20"
                          >
                            View QR Pass
                          </button>
                          {b.checkInStatus === 'PENDING' && new Date(b.event.showTime) > new Date() && (
                            <button
                              onClick={() => setTransferringBooking(b)}
                              className="px-3 py-2 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                              title="Send this ticket to another TicketVault user"
                            >
                              <Send className="w-3.5 h-3.5" /> Transfer
                            </button>
                          )}
                          <button
                            onClick={() => setCancellingBooking(b)}
                            className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition"
                            title="Cancel Booking & Refund"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: WAITLIST SUBSCRIPTIONS */}
      {activeTab === 'WAITLIST' && (
        <div className="space-y-4">
          {waitlists.length === 0 ? (
            <div className="py-20 text-center glass-panel rounded-3xl">
              <Flame className="w-12 h-12 mx-auto text-purple-600 mb-3" />
              <p className="text-slate-300 font-semibold">No waitlist entries</p>
              <p className="text-xs text-slate-400 mt-1">
                When an event tier is sold out, you can join the queue to be auto-allocated on cancellations!
              </p>
            </div>
          ) : (
            waitlists.map((w) => {
              const hasActiveOffer = w.status === 'OFFERED' && w.offerToken;

              return (
                <div
                  key={w.id}
                  className={`glass-panel p-6 rounded-3xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                    hasActiveOffer
                      ? 'border-amber-500/60 bg-amber-950/10 animate-pulse'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
                      <Flame className="w-6 h-6 text-purple-400" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          {w.category} Category
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            hasActiveOffer
                              ? 'bg-amber-500 text-slate-950 animate-pulse'
                              : w.status === 'CLAIMED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {hasActiveOffer ? '⚡ SEAT OFFER READY!' : w.status}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white font-heading">{w.event.title}</h3>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>Position in Queue: <strong className="text-white font-mono">#{w.position}</strong></span>
                        <span>•</span>
                        <span>Joined: {new Date(w.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {hasActiveOffer ? (
                      <Link
                        to={`/waitlist/claim/${w.offerToken}`}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-amber-500/30 flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" /> Claim Time-Limited Offer
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Waiting for cancellation match...</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Ticket Pass Modal */}
      <Modal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="🎟️ Digital Admission Pass"
        maxWidth="max-w-3xl"
      >
        {selectedTicket && <TicketCard booking={selectedTicket} />}
      </Modal>

      {/* Transfer Ticket Modal */}
      <Modal
        isOpen={!!transferringBooking}
        onClose={closeTransfer}
        title="🎁 Transfer Ticket"
        maxWidth="max-w-md"
      >
        {transferringBooking && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Send <strong className="font-mono text-cyan-400">{transferringBooking.bookingReference}</strong> (
              {transferringBooking.items.map((i) => i.seatLabel).join(', ')}) for{' '}
              <strong>{transferringBooking.event.title}</strong> to another registered TicketVault user.
            </p>

            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-xs space-y-1">
              <p className="font-bold text-cyan-300">How transfer works</p>
              <p className="text-slate-300">
                A freshly signed QR pass is issued to the recipient. Your current QR is revoked
                immediately and will be rejected at the gate, so a ticket can't be resold twice.
              </p>
            </div>

            <input
              type="email"
              placeholder="recipient@example.com"
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTransferBooking()}
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
            />

            {transferError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeTransfer}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Keep Ticket
              </button>
              <button
                type="button"
                onClick={handleTransferBooking}
                disabled={transferLoading || !transferEmail.trim()}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {transferLoading ? 'Re-issuing pass...' : 'Transfer Ticket'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!cancellingBooking}
        onClose={() => setCancellingBooking(null)}
        title="⚠️ Confirm Booking Cancellation"
        maxWidth="max-w-md"
      >
        {cancellingBooking && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to cancel booking{' '}
              <strong className="font-mono text-cyan-400">
                {cancellingBooking.bookingReference}
              </strong>{' '}
              for <strong>{cancellingBooking.event.title}</strong>?
            </p>

            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs space-y-1">
              <p className="font-bold">⚡ Automated Reallocation Notice:</p>
              <p className="text-slate-300">
                Your seats ({cancellingBooking.items.map((i) => i.seatLabel).join(', ')}) will be
                immediately reallocated to the next customers in the priority waitlist!
              </p>
              <p className="font-semibold text-emerald-400 pt-1">
                Instant UPI / Bank Refund: ₹{cancellingBooking.totalAmount.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancellingLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                {cancellingLoading ? 'Reallocating...' : 'Confirm & Release Seats'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
