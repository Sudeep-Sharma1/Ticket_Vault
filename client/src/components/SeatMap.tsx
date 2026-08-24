import React, { useState } from 'react';
import { SeatItem, SeatCategory, SeatStatus } from '../types';
import { Sparkles, Check, Lock, Clock, ShieldAlert } from 'lucide-react';

interface SeatMapProps {
  seatGrid: Record<string, SeatItem[]>;
  selectedSeats: SeatItem[];
  currentUserId?: string;
  onToggleSeat: (seat: SeatItem) => void;
  tierPricing: Record<string, number>;
  disabled?: boolean;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seatGrid,
  selectedSeats,
  currentUserId,
  onToggleSeat,
  tierPricing,
  disabled = false,
}) => {
  const [hoveredSeat, setHoveredSeat] = useState<SeatItem | null>(null);

  const isSelected = (seat: SeatItem) => selectedSeats.some((s) => s.id === seat.id);

  const getSeatColor = (seat: SeatItem) => {
    if (isSelected(seat)) {
      return 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/30 scale-105';
    }

    switch (seat.status) {
      case 'AVAILABLE':
        if (seat.category === 'VIP') {
          return 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20';
        }
        if (seat.category === 'PREMIUM') {
          return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500 hover:text-slate-950 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20';
        }
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500 hover:text-slate-950 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20';

      case 'HELD':
        const isMyHold = seat.heldByUserId === currentUserId;
        return isMyHold
          ? 'bg-amber-500/80 text-slate-950 font-bold border-amber-400 ring-2 ring-amber-400/60 animate-pulse'
          : 'bg-amber-950/40 text-amber-500 border-amber-700/50 cursor-not-allowed opacity-75 animate-pulse';

      case 'WAITLIST_RESERVED':
        return 'bg-purple-900/60 text-purple-300 border-purple-500/60 cursor-not-allowed animate-pulse';

      case 'BOOKED':
      default:
        return 'bg-slate-800/60 text-slate-600 border-slate-700/40 cursor-not-allowed opacity-40';
    }
  };

  const getSeatStatusText = (seat: SeatItem) => {
    if (isSelected(seat)) return 'Selected by you';
    if (seat.status === 'AVAILABLE') return 'Available for selection';
    if (seat.status === 'HELD') {
      return seat.heldByUserId === currentUserId ? 'Held by you in current session' : 'Currently in another customer’s checkout';
    }
    if (seat.status === 'WAITLIST_RESERVED') return 'Reserved for priority waitlist offer';
    if (seat.status === 'BOOKED') return 'Sold / Booked';
    return seat.status;
  };

  const rows = Object.keys(seatGrid).sort();

  return (
    <div className="w-full flex flex-col items-center select-none py-4">
      {/* Screen / Stage Curved Projector */}
      <div className="w-full max-w-2xl text-center mb-8">
        <div className="screen-curve mb-3" />
        <span className="text-[11px] font-bold text-cyan-400/80 uppercase tracking-[0.3em]">
          STAGE / SCREEN
        </span>
      </div>

      {/* Seat Grid Layout */}
      <div className="w-full overflow-x-auto py-2 flex flex-col items-center custom-scrollbar">
        <div className="min-w-fit flex flex-col gap-2.5 px-4">
          {rows.map((rowLabel) => {
            const seatsInRow = seatGrid[rowLabel];
            const rowCategory = seatsInRow[0]?.category || 'STANDARD';

            return (
              <div key={rowLabel} className="flex items-center gap-3 justify-center">
                {/* Left Row Identifier */}
                <span className="w-6 text-center font-mono font-bold text-xs text-slate-400">
                  {rowLabel}
                </span>

                {/* Seats in Row */}
                <div className="flex items-center gap-2">
                  {seatsInRow.map((seat) => {
                    const selected = isSelected(seat);
                    const isAvailable = seat.status === 'AVAILABLE';

                    return (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={disabled || (!isAvailable && !selected)}
                        onClick={() => onToggleSeat(seat)}
                        onMouseEnter={() => setHoveredSeat(seat)}
                        onMouseLeave={() => setHoveredSeat(null)}
                        className={`w-8 h-8 rounded-lg text-xs font-mono font-semibold flex items-center justify-center transition-all duration-150 border relative ${getSeatColor(
                          seat
                        )}`}
                        title={`Seat ${seat.label} • ₹${seat.price}`}
                      >
                        {selected ? (
                          <Check className="w-4 h-4" />
                        ) : seat.status === 'BOOKED' ? (
                          <Lock className="w-3 h-3 opacity-60" />
                        ) : seat.status === 'HELD' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          seat.number
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right Row Identifier */}
                <span className="w-6 text-center font-mono font-bold text-xs text-slate-400">
                  {rowLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Hover Tooltip Bar */}
      <div className="h-9 mt-4 flex items-center justify-center">
        {hoveredSeat ? (
          <div className="px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-xs text-slate-200 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-100">
            <span className="font-bold text-white font-mono">{hoveredSeat.label}</span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-cyan-400">{hoveredSeat.category} Tier</span>
            <span className="text-slate-400">•</span>
            <span className="font-bold text-emerald-400">₹{hoveredSeat.price}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300 italic">{getSeatStatusText(hoveredSeat)}</span>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">Hover over seats to preview category and pricing details</p>
        )}
      </div>

      {/* Seat Category & Status Legend */}
      <div className="mt-6 pt-6 border-t border-slate-800/80 w-full max-w-3xl flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400">
        {/* Available Tier Badges */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500/30 border border-amber-500/50" />
          <span>VIP (₹{tierPricing.VIP || 550})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-cyan-500/30 border border-cyan-500/50" />
          <span>Premium (₹{tierPricing.PREMIUM || 350})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-indigo-500/30 border border-indigo-500/50" />
          <span>Standard (₹{tierPricing.STANDARD || 220})</span>
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        {/* State Badges */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500 border border-emerald-400 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-slate-950" />
          </div>
          <span className="text-emerald-400 font-medium">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-950/60 border border-amber-600 animate-pulse" />
          <span>Held (TTL)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-950/60 border border-purple-500" />
          <span>Waitlist</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-800 border border-slate-700 opacity-50" />
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
};
