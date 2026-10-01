import React, { useState } from 'react';
import { BookingDetail } from '../types';
import {
  Calendar,
  MapPin,
  User,
  Ticket,
  Printer,
  Copy,
  Check,
  Download,
  ShieldCheck,
} from 'lucide-react';

interface TicketCardProps {
  booking: BookingDetail;
  showActions?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({ booking, showActions = true }) => {
  const [copied, setCopied] = useState(false);
  const [passCopied, setPassCopied] = useState(false);
  const isSignedPass = booking.qrCodeData?.startsWith('TV1.');

  const formattedDate = new Date(booking.event.showTime).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(booking.event.showTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopyRef = () => {
    navigator.clipboard.writeText(booking.bookingReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPass = () => {
    navigator.clipboard.writeText(booking.qrCodeData);
    setPassCopied(true);
    setTimeout(() => setPassCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Boarding Pass / Ticket Card */}
      <div className="relative rounded-3xl overflow-hidden glass-panel-elevated border border-slate-700/80 shadow-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95">
        {/* Top Header Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900 border-b border-slate-800/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  {booking.event.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {booking.status}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight">
                {booking.event.title}
              </h2>
            </div>

            {/* Reference Badge */}
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Booking Reference
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-base font-extrabold text-cyan-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
                  {booking.bookingReference}
                </span>
                <button
                  onClick={handleCopyRef}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Copy Reference"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Details & QR Code Split Section */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Info Fields */}
          <div className="md:col-span-7 space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Date & Time
                </span>
                <p className="text-sm font-bold text-slate-100 mt-1">{formattedDate}</p>
                <p className="text-xs text-indigo-300 font-semibold">{formattedTime}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Venue & Hall
                </span>
                <p className="text-sm font-bold text-slate-100 mt-1">{booking.event.venue.name}</p>
                <p className="text-xs text-slate-400">{booking.event.venue.city}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" /> Passenger / Attendee
                </span>
                <p className="text-sm font-bold text-slate-100 mt-1">{booking.customerName}</p>
                <p className="text-xs text-slate-400">{booking.customerEmail}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Total Amount</span>
                <p className="text-lg font-black text-emerald-400 mt-0.5">
                  ₹{booking.totalAmount.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500">Paid & Verified (GST Incl.)</span>
              </div>
            </div>

            {/* Allocated Seat Badges */}
            <div className="pt-3 border-t border-slate-800">
              <span className="text-slate-400 text-xs block mb-2 font-medium">
                Allocated Seats ({booking.items.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {booking.items.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center gap-2 shadow-sm"
                  >
                    <Ticket className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-mono text-sm font-black text-white">{item.seatLabel}</span>
                    <span className="text-[10px] font-semibold text-indigo-300">({item.category})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right QR Pass Column */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-inner text-slate-950 text-center">
            <div className="text-xs font-black uppercase tracking-wider text-slate-800 mb-1">
              Admission QR Pass
            </div>
            <img
              src={booking.qrCodeImage}
              alt="Admission QR Code"
              className="w-44 h-44 object-contain rounded-lg border border-slate-200"
            />
            <p className="text-[11px] text-slate-500 mt-2 leading-tight">
              Scan at entrance turns gate green for instant entry.
            </p>
            {isSignedPass && (
              <div className="mt-3 flex flex-col items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" /> Signed VaultPass
                </span>
                <button
                  onClick={handleCopyPass}
                  className="text-[10px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                  title="Copy the signed pass code to paste into the gate scanner"
                >
                  {passCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {passCopied ? 'Pass code copied' : 'Copy pass code'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="px-6 py-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              A copy of this ticket has also been delivered to your email.
            </p>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
