import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  AlertCircle,
  Sparkles,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Flame,
  ShieldCheck,
  Wand2,
  Shuffle,
  Minus,
  Plus,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { EventItem, SeatItem, SeatSuggestion, VenueRowLayout } from '../types';
import { SeatMap } from '../components/SeatMap';
import { Modal } from '../components/Modal';

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinEventRoom, leaveEventRoom } = useSocket();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [seatGrid, setSeatGrid] = useState<Record<string, SeatItem[]>>({});
  const [selectedSeats, setSelectedSeats] = useState<SeatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aisles, setAisles] = useState<Record<string, number[]>>({});

  // Smart Seat Finder State
  const [smartCount, setSmartCount] = useState(2);
  const [smartTier, setSmartTier] = useState('ANY');
  const [smartSuggestions, setSmartSuggestions] = useState<SeatSuggestion[]>([]);
  const [smartIndex, setSmartIndex] = useState(0);
  const [smartLoading, setSmartLoading] = useState(false);

  // Waitlist Modal State
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [waitlistCategory, setWaitlistCategory] = useState<string>('VIP');
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState<string | null>(null);

  // Load Event and Seat Grid
  const loadEventAndSeats = async () => {
    if (!id) return;
    try {
      const [eventRes, seatMapRes] = await Promise.all([
        api.getEvent(id),
        api.getSeatMap(id),
      ]);
      setEvent(eventRes.event);
      setSeatGrid(seatMapRes.seatGrid || {});
      const rows: VenueRowLayout[] = seatMapRes.layoutConfig?.rows || [];
      setAisles(Object.fromEntries(rows.map((r) => [r.label, r.aisleAfter || []])));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventAndSeats();

    // Join WebSocket Room for Real-Time Synchronization
    if (id) {
      joinEventRoom(id);
    }

    return () => {
      if (id) {
        leaveEventRoom(id);
      }
    };
  }, [id]);

  // Real-Time WebSocket Listeners
  useEffect(() => {
    if (!socket || !id) return;

    const handleSeatStatusChanged = (data: {
      eventId: string;
      seatIds: string[];
      status: string;
      heldByUserId?: string;
      expiresAt?: string;
    }) => {
      if (data.eventId !== id) return;

      setSeatGrid((prevGrid) => {
        const nextGrid = { ...prevGrid };
        Object.keys(nextGrid).forEach((row) => {
          nextGrid[row] = nextGrid[row].map((seat) => {
            if (data.seatIds.includes(seat.id)) {
              return {
                ...seat,
                status: data.status as any,
                heldByUserId: data.heldByUserId,
                holdExpiresAt: data.expiresAt,
              };
            }
            return seat;
          });
        });
        return nextGrid;
      });

      // If any currently selected seat was taken by someone else, deselect it and show warning
      setSelectedSeats((prevSelected) => {
        const remaining = prevSelected.filter((s) => !data.seatIds.includes(s.id));
        if (remaining.length !== prevSelected.length && data.status !== 'AVAILABLE') {
          setErrorMessage('Notice: One of your chosen seats was just held by another customer.');
        }
        return remaining;
      });
    };

    socket.on('seat_status_changed', handleSeatStatusChanged);

    return () => {
      socket.off('seat_status_changed', handleSeatStatusChanged);
    };
  }, [socket, id]);

  const handleToggleSeat = (seat: SeatItem) => {
    setErrorMessage(null);
    setSmartSuggestions([]);
    if (selectedSeats.some((s) => s.id === seat.id)) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= 8) {
        setErrorMessage('Maximum 8 seats can be selected per session');
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const applySuggestion = (suggestion: SeatSuggestion) => {
    const allSeats = Object.values(seatGrid).flat();
    const picked = suggestion.seatIds
      .map((seatId) => allSeats.find((s) => s.id === seatId))
      .filter((s): s is SeatItem => !!s && s.status === 'AVAILABLE');
    setSelectedSeats(picked);
  };

  const handleSmartPick = async () => {
    setSmartLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.findBestSeats(id!, smartCount, smartTier);
      setSmartSuggestions(res.suggestions);
      setSmartIndex(0);
      applySuggestion(res.suggestions[0]);
    } catch (err: any) {
      setSmartSuggestions([]);
      setErrorMessage(err.message || 'Could not find seats matching your request');
    } finally {
      setSmartLoading(false);
    }
  };

  const handleNextSuggestion = () => {
    const next = (smartIndex + 1) % smartSuggestions.length;
    setSmartIndex(next);
    applySuggestion(smartSuggestions[next]);
  };

  const handleHoldAndProceed = async () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(`/events/${id}`));
      return;
    }

    if (selectedSeats.length === 0) {
      setErrorMessage('Please select at least 1 available seat.');
      return;
    }

    setHolding(true);
    setErrorMessage(null);

    try {
      const seatIds = selectedSeats.map((s) => s.id);
      const res = await api.holdSeats(id!, seatIds);

      // Navigate to checkout with the valid hold token
      navigate(`/checkout?holdToken=${res.holdToken}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Seat hold conflict: seats already reserved.');
      // Refresh seat grid to latest state
      loadEventAndSeats();
      setSelectedSeats([]);
    } finally {
      setHolding(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(`/events/${id}`));
      return;
    }

    setJoiningWaitlist(true);
    setWaitlistSuccess(null);
    setErrorMessage(null);

    try {
      const res = await api.joinWaitlist(id!, waitlistCategory);
      setWaitlistSuccess(res.message);
      loadEventAndSeats();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to join waitlist');
    } finally {
      setJoiningWaitlist(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <p className="text-red-400 font-bold">Event not found</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs"
        >
          Back to Events
        </button>
      </div>
    );
  }

  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const showDate = new Date(event.showTime).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const showTime = new Date(event.showTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen pb-32 pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Event Header Banner */}
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 mb-8 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
                {event.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                {event.venue.city}
              </span>
              {event.stats?.isSoldOut && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                  Sold Out • Waitlist Active
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white font-heading tracking-tight">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                {showDate} at {showTime}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                {event.venue.name}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                {event.durationMinutes} minutes
              </span>
            </div>
          </div>

          {/* Waitlist Button */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsWaitlistModalOpen(true)}
              className="w-full md:w-auto px-5 py-3 rounded-2xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
            >
              <Flame className="w-4 h-4 text-purple-400" />
              Join Category Waitlist
            </button>
          </div>
        </div>
      </div>

      {/* Error / Conflict Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/60 text-red-300 text-xs flex items-center gap-3 animate-in fade-in duration-200 shadow-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Visual Seat Map Component */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-white font-heading">
              Interactive Visual Seating Map
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Held seats (clock icon) are locked in checkout sessions and auto-release on TTL timeout.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.releaseMyEventHolds(id!);
                    loadEventAndSeats();
                  } catch (e) {}
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 text-xs font-semibold transition"
                title="Release seats held in your previous checkout sessions"
              >
                Release My Holds
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  await api.resetEventHolds(id!);
                  loadEventAndSeats();
                } catch (e) {}
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              title="Demo Helper: Unlock all currently held seats back to Available immediately"
            >
              Clear All Held Seats
            </button>
          </div>
        </div>

        {/* Smart Seat Finder */}
        <div className="mb-6 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-2 text-indigo-200">
              <Wand2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Smart Seat Finder</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <div className="flex items-center rounded-xl bg-slate-900 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setSmartCount((c) => Math.max(1, c - 1))}
                  className="p-2 text-slate-400 hover:text-white"
                  aria-label="Fewer seats"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-16 text-center text-xs font-bold text-white">
                  {smartCount} seat{smartCount > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setSmartCount((c) => Math.min(8, c + 1))}
                  className="p-2 text-slate-400 hover:text-white"
                  aria-label="More seats"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <select
                value={smartTier}
                onChange={(e) => setSmartTier(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ANY">Any tier</option>
                <option value="VIP">VIP</option>
                <option value="PREMIUM">Premium</option>
                <option value="STANDARD">Standard</option>
              </select>

              <button
                type="button"
                onClick={handleSmartPick}
                disabled={smartLoading || holding}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {smartLoading ? 'Scoring seats...' : 'Find Best Seats'}
              </button>

              {smartSuggestions.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextSuggestion}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Try another ({smartIndex + 1}/{smartSuggestions.length})
                </button>
              )}
            </div>
          </div>

          {smartSuggestions[smartIndex] && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="text-slate-300">
                Picked <strong className="font-mono text-white">{smartSuggestions[smartIndex].labels.join(', ')}</strong>
              </span>
              <span className="text-emerald-400 font-bold">
                Sightline score {smartSuggestions[smartIndex].score}/100
              </span>
              {smartSuggestions[smartIndex].contiguous ? (
                <span className="text-cyan-300">Sitting together, no aisle split</span>
              ) : (
                <span className="text-amber-300">No adjacent block left: best seats are split up</span>
              )}
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-500">
            Ranks every adjacent block by distance from the row centre and from the ideal viewing depth
            ({event.category === 'CONCERT' ? 'closest to the stage' : 'about 60% back from the screen'}).
          </p>
        </div>

        <SeatMap
          aisles={aisles}
          seatGrid={seatGrid}
          selectedSeats={selectedSeats}
          currentUserId={user?.id}
          onToggleSeat={handleToggleSeat}
          tierPricing={event.tierPricing as any}
          disabled={holding}
        />
      </div>

      {/* Sticky Bottom Checkout Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 glass-panel border-t border-slate-800/90 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Selected Seat Summary */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Selected Seats</span>
              {selectedSeats.length === 0 ? (
                <span className="text-sm font-semibold text-slate-500 italic">
                  No seats selected yet
                </span>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  {selectedSeats.map((s) => (
                    <span
                      key={s.id}
                      className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="sm:pl-6 sm:border-l sm:border-slate-800 text-right sm:text-left">
              <span className="text-xs text-slate-400 block font-medium">Total Amount</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                ₹{totalPrice.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="w-full sm:w-auto flex gap-3">
            <button
              onClick={handleHoldAndProceed}
              disabled={selectedSeats.length === 0 || holding}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 text-white font-bold text-sm transition shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2"
            >
              {holding ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Locking Seats (CAS)...</span>
                </>
              ) : (
                <>
                  <span>Hold Seats & Checkout ({selectedSeats.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Waitlist Modal */}
      <Modal
        isOpen={isWaitlistModalOpen}
        onClose={() => {
          setIsWaitlistModalOpen(false);
          setWaitlistSuccess(null);
        }}
        title="⚡ Join Priority Seat Waitlist"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            When bookings are cancelled or abandoned in your chosen tier, seats are immediately offered to waitlisted customers in FIFO order with a time-limited email offer!
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Desired Seat Category
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['VIP', 'PREMIUM', 'STANDARD'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setWaitlistCategory(cat)}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                    waitlistCategory === cat
                      ? 'bg-purple-950/80 border-purple-500 text-white ring-2 ring-purple-500/40'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] font-mono text-purple-300">
                    ₹{(event.tierPricing as any)[cat] || 250}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {waitlistSuccess && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{waitlistSuccess}</span>
            </div>
          )}

          <button
            onClick={handleJoinWaitlist}
            disabled={joiningWaitlist}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
          >
            {joiningWaitlist ? 'Enrolling in Queue...' : 'Confirm Waitlist Spot'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
