import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Film,
  Music,
  Calendar,
  MapPin,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Users,
  Clock,
  Flame,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { EventItem } from '../types';

export const HomePage: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MOVIE' | 'CONCERT'>('ALL');

  useEffect(() => {
    fetchEvents();
  }, [categoryFilter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (categoryFilter !== 'ALL') {
        params.category = categoryFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      const res = await api.getEvents(params);
      setEvents(res.events || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  const getOccupancyBadge = (event: EventItem) => {
    if (!event.stats) return null;
    const { availableSeats, totalSeats, isSoldOut } = event.stats;

    if (isSoldOut || availableSeats === 0) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 animate-pulse">
          <Flame className="w-3 h-3 text-purple-400" /> Waitlist Open
        </span>
      );
    }

    const percentage = (availableSeats / totalSeats) * 100;
    if (percentage < 30) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-400" /> Filling Fast ({availableSeats} left)
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
        <CheckCircle className="w-3 h-3 text-emerald-400" /> {availableSeats} Seats Available
      </span>
    );
  };

  const getLowestPrice = (pricing: any) => {
    if (!pricing) return 20;
    const prices = Object.values(pricing)
      .map((p) => Number(p))
      .filter((p) => !isNaN(p) && p > 0);
    return prices.length > 0 ? Math.min(...prices) : 20;
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-cyan-500/15 to-purple-600/20 blur-3xl pointer-events-none rounded-full" />

        <div className="text-center max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Zero Seat Loss • Atomic Concurrency • Instant Waitlist Reallocation
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-heading leading-tight">
            Book Blockbusters & Live Concerts{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-300 to-purple-400">
              in Real-Time.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Choose exact seats from live visual maps. Held seats auto-release on abandonment, and sold-out shows automatically reallocate cancellations to priority waitlists.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-8 max-w-xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search movies, concert artists, or venues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 shadow-xl"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm rounded-2xl transition shadow-lg shadow-indigo-500/25 flex items-center gap-2 flex-shrink-0"
            >
              Search
            </button>
          </form>

          {/* Category Filter Tabs */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                categoryFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Shows
            </button>
            <button
              onClick={() => setCategoryFilter('MOVIE')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                categoryFilter === 'MOVIE'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Film className="w-3.5 h-3.5" /> Movies & IMAX
            </button>
            <button
              onClick={() => setCategoryFilter('CONCERT')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                categoryFilter === 'CONCERT'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Music className="w-3.5 h-3.5" /> Live Concerts
            </button>
          </div>
        </div>
      </section>

      {/* Events Grid Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white font-heading tracking-tight">
              Featured Events & Screenings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live seat maps available for all scheduled performances
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-slate-900/50 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center glass-panel rounded-3xl">
            <Film className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-slate-300 font-semibold">No events matching your filters</p>
            <button
              onClick={() => {
                setSearch('');
                setCategoryFilter('ALL');
              }}
              className="mt-3 text-xs text-indigo-400 hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const showDate = new Date(event.showTime).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const showTime = new Date(event.showTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={event.id}
                  className="glass-card rounded-3xl overflow-hidden flex flex-col group border border-slate-800"
                >
                  {/* Event Banner Image */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                    <img
                      src={
                        event.bannerUrl ||
                        'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-slate-900/80 backdrop-blur-md text-slate-200 border border-slate-700 flex items-center gap-1">
                        {event.category === 'MOVIE' ? (
                          <Film className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <Music className="w-3 h-3 text-cyan-400" />
                        )}
                        {event.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">{getOccupancyBadge(event)}</div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white font-heading line-clamp-1 group-hover:text-indigo-300 transition">
                        {event.title}
                      </h3>

                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>

                      <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <span>
                            {showDate} • <strong className="text-white">{showTime}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span className="truncate">{event.venue.name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer / Price and CTA */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">
                          From
                        </span>
                        <span className="text-lg font-black text-emerald-400 font-mono">
                          ${getLowestPrice(event.tierPricing).toFixed(2)}
                        </span>
                      </div>

                      <Link
                        to={`/events/${event.id}`}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
                      >
                        {event.stats?.isSoldOut ? 'Join Waitlist' : 'Select Seats'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
