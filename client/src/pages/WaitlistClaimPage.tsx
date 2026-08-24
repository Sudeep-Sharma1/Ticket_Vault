import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Flame,
  Sparkles,
  Clock,
  Ticket,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HoldTimer } from '../components/HoldTimer';

export const WaitlistClaimPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    const fetchOffer = async () => {
      try {
        const res = await api.getOfferDetails(token);
        setOffer(res.offer);
      } catch (err: any) {
        setError(err.message || 'Waitlist offer not found or expired');
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [token]);

  const handleClaim = async () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(`/waitlist/claim/${token}`));
      return;
    }

    if (!token) return;
    setClaiming(true);
    setError(null);

    try {
      const res = await api.claimOffer(token);
      // Converted to active seat hold, navigate directly to checkout!
      navigate(`/checkout?holdToken=${res.holdToken}`);
    } catch (err: any) {
      setError(err.message || 'Failed to claim waitlist offer');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white font-heading">Offer Expired or Invalid</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          {error || 'This waitlist offer was not claimed in time and has been reallocated to the next customer in queue.'}
        </p>
        <Link
          to="/"
          className="mt-6 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/25"
        >
          Explore Other Events
        </Link>
      </div>
    );
  }

  const { event, seat, expiresAt, category } = offer;

  return (
    <div className="min-h-screen pb-24 pt-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-bold mb-4 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Priority Waitlist Match Found!
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white font-heading tracking-tight">
          Claim Your Reserved Seat
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-2">
          A cancellation occurred and your position in queue was matched for this show.
        </p>
      </div>

      <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl border border-purple-500/30 space-y-6">
        {/* Countdown Bar */}
        <HoldTimer
          expiresAt={expiresAt}
          onExpire={() => setError('Time limit reached! Seat reallocated to the next waitlisted user.')}
        />

        {/* Offer Details */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-500/30 text-purple-300 border border-purple-500/40">
              {category} Category
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Offer Ref: {(token || '').slice(0, 10)}...
            </span>
          </div>

          <h3 className="text-xl font-bold text-white font-heading">{event.title}</h3>

          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 pt-2 border-t border-slate-800">
            <div>
              <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-indigo-400" /> Date & Time</span>
              <p className="font-semibold text-slate-200 mt-0.5">{new Date(event.showTime).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> Venue</span>
              <p className="font-semibold text-slate-200 mt-0.5">{event.venue.name}</p>
            </div>
          </div>

          {seat && (
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-slate-300">Offered Seat:</span>
                <span className="font-mono text-base font-black text-white">{seat.label}</span>
              </div>
              <span className="font-mono text-base font-black text-emerald-400">
                ₹{seat.price.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm transition shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2"
        >
          {claiming ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Locking Offer & Creating Hold...</span>
            </>
          ) : (
            <>
              <span>Claim Seat & Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
