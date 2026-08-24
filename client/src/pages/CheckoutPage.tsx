import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  User,
  Mail,
  Phone,
  Ticket,
  Calendar,
  MapPin,
  AlertTriangle,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HoldTimer } from '../components/HoldTimer';

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const holdToken = searchParams.get('holdToken');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [holdDetails, setHoldDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState('CARD');

  useEffect(() => {
    if (!holdToken) {
      navigate('/');
      return;
    }

    const fetchHold = async () => {
      try {
        const res = await api.getHoldDetails(holdToken);
        setHoldDetails(res);
        if (user) {
          setCustomerName(user.name);
          setCustomerEmail(user.email);
          if (user.phone) setCustomerPhone(user.phone);
        }
      } catch (err: any) {
        setError(err.message || 'Seat hold expired or invalid');
      } finally {
        setLoading(false);
      }
    };

    fetchHold();
  }, [holdToken, user]);

  const handleExpire = () => {
    setError('Your seat hold session has expired. Held seats were automatically released.');
  };

  const handleCancelAndRelease = async () => {
    if (!holdToken) return;
    try {
      await api.releaseHold(holdToken);
      navigate(holdDetails?.event?.id ? `/events/${holdDetails.event.id}` : '/');
    } catch (err) {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdToken || !customerName.trim() || !customerEmail.trim()) {
      setError('Please fill in attendee name and email address');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.checkout({
        holdToken,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        paymentMethod,
      });

      // Navigate to success screen
      navigate(`/booking/success/${res.booking.bookingReference}`);
    } catch (err: any) {
      setError(err.message || 'Checkout failed. Your hold might have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !holdDetails) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white font-heading">Hold Session Terminated</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{error}</p>
        <Link
          to="/"
          className="mt-6 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/25"
        >
          Explore Events & Reselect Seats
        </Link>
      </div>
    );
  }

  const { event, seats, totalAmount, expiresAt } = holdDetails;

  return (
    <div className="min-h-screen pb-24 pt-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleCancelAndRelease}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel & Release Seats
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Checkout Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Hold Countdown Timer Card */}
          <HoldTimer expiresAt={expiresAt} onExpire={handleExpire} />

          {error && (
            <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Attendee Form */}
          <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5">
            <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              Attendee & Ticket Details
            </h3>
            <p className="text-xs text-slate-400 -mt-2">
              The QR pass will be issued and emailed to this address.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Simulator (India UPI / Cards / NetBanking) */}
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Select Indian Payment Mode
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition ${
                    paymentMethod === 'UPI' || paymentMethod === 'CARD'
                      ? 'bg-indigo-950/80 border-indigo-500 text-white ring-2 ring-indigo-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-bold text-cyan-400 text-sm">⚡ UPI</span>
                  <span className="text-[10px] text-slate-400">GPay / PhonePe / Paytm</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARDS')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition ${
                    paymentMethod === 'CARDS'
                      ? 'bg-indigo-950/80 border-indigo-500 text-white ring-2 ring-indigo-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] text-slate-300">RuPay / Visa / Master</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('NETBANKING')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition ${
                    paymentMethod === 'NETBANKING'
                      ? 'bg-indigo-950/80 border-indigo-500 text-white ring-2 ring-indigo-500/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] text-slate-300">HDFC / SBI / ICICI</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 mt-4"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Payment & Generating QR Ticket...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm Booking • Pay ₹{totalAmount.toLocaleString('en-IN')}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white font-heading">
              Reservation Summary
            </h3>

            {/* Event Details */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-500/30 text-indigo-300">
                {event.category}
              </span>
              <h4 className="text-base font-bold text-white leading-tight font-heading">{event.title}</h4>
              <div className="text-xs text-slate-400 space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{new Date(event.showTime).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{event.venue.name}</span>
                </div>
              </div>
            </div>

            {/* Seat Itemization */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-400">Held Seats ({seats.length})</span>
              {seats.map((seat: any) => (
                <div
                  key={seat.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Ticket className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-mono font-bold text-white">Seat {seat.label}</span>
                    <span className="text-[10px] text-slate-400">({seat.category} Tier)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">₹{seat.price.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-slate-200">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Convenience Fee & GST (18%)</span>
                <span className="font-mono text-emerald-400">Included (₹0.00 extra)</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Amount Due</span>
                <span className="font-mono text-emerald-400 text-base font-black">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
