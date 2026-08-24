import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Ticket,
  Film,
  Users,
  PlusCircle,
  TrendingUp,
  Calendar,
  MapPin,
  Flame,
  CheckCircle2,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { api } from '../services/api';
import { Venue } from '../types';
import { Modal } from '../components/Modal';

export const OrganiserDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Event Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'MOVIE' | 'CONCERT'>('MOVIE');
  const [bannerUrl, setBannerUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('120');
  const [venueId, setVenueId] = useState('');
  const [showTime, setShowTime] = useState('');
  const [vipPrice, setVipPrice] = useState('45');
  const [premiumPrice, setPremiumPrice] = useState('30');
  const [standardPrice, setStandardPrice] = useState('18');
  const [holdTtlMinutes, setHoldTtlMinutes] = useState('10');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, venuesRes] = await Promise.all([
        api.getOrganiserDashboard(),
        api.getVenues(),
      ]);
      setDashboardData(dashRes);
      setVenues(venuesRes.venues || []);
      if (venuesRes.venues && venuesRes.venues.length > 0 && !venueId) {
        setVenueId(venuesRes.venues[0].id);
      }
    } catch (err) {
      console.error('Failed to load organiser dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !venueId || !showTime) {
      setFormError('Please fill in title, venue, and show time');
      return;
    }

    setCreating(true);
    setFormError(null);

    try {
      await api.createEvent({
        title,
        description,
        category,
        bannerUrl: bannerUrl || undefined,
        durationMinutes: parseInt(durationMinutes, 10),
        venueId,
        showTime: new Date(showTime).toISOString(),
        tierPricing: {
          VIP: parseFloat(vipPrice),
          PREMIUM: parseFloat(premiumPrice),
          STANDARD: parseFloat(standardPrice),
        },
        holdTtlMinutes: parseInt(holdTtlMinutes, 10),
      });

      setIsCreateModalOpen(false);
      // Reset form
      setTitle('');
      setDescription('');
      fetchDashboard();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const { metrics, events } = dashboardData || { metrics: {}, events: [] };

  return (
    <div className="min-h-screen pb-24 pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white font-heading tracking-tight">
            Organiser Revenue & Event Operations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time sales tracking, seat occupancy, and event creation engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Refresh Analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Gross Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono mt-3">
            ${(metrics.totalRevenue || 0).toFixed(2)}
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> Confirmed bookings only
          </span>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Tickets Sold</span>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono mt-3">
            {metrics.totalTicketsSold || 0}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Across {metrics.totalEvents || 0} event listings
          </span>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Events Published</span>
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Film className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono mt-3">
            {metrics.totalEvents || 0}
          </p>
          <span className="text-[10px] text-cyan-400 mt-1 block">
            Active in catalog
          </span>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Waitlist Demand</span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono mt-3">
            {events.reduce((sum: number, e: any) => sum + (e.waitingListCount || 0), 0)}
          </p>
          <span className="text-[10px] text-purple-300 mt-1 block">
            Customers queued for auto-allocation
          </span>
        </div>
      </div>

      {/* Events Table / Breakdown */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-heading">
            Event Performance & Real-Time Seat Status
          </h2>
          <span className="text-xs text-slate-400">{events.length} Shows</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Event & Category</th>
                <th className="px-6 py-4">Venue & Time</th>
                <th className="px-6 py-4">Occupancy Rate</th>
                <th className="px-6 py-4">Available / Held</th>
                <th className="px-6 py-4">Waitlist Queue</th>
                <th className="px-6 py-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {events.map((ev: any) => {
                const showDate = new Date(ev.showTime).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={ev.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-semibold text-white">
                      <div className="text-sm font-bold">{ev.title}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase font-mono mt-1 inline-block">
                        {ev.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-200 font-medium">{ev.venueName}</div>
                      <div className="text-slate-500 text-[11px]">{showDate}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                            style={{ width: `${Math.min(100, ev.occupancyRate)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-bold text-slate-200">
                          {ev.occupancyRate.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {ev.ticketsSold} of {ev.totalSeats} seats sold
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                          {ev.availableSeats} Avail
                        </span>
                        {ev.heldSeats > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono animate-pulse">
                            {ev.heldSeats} Held
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {ev.waitingListCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1 w-fit">
                          <Flame className="w-3 h-3 text-purple-400" /> {ev.waitingListCount} Waiting
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">0 waiting</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      ${ev.revenue.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Event Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="🎬 Create New Event & Seat Map"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Oppenheimer IMAX 70mm Special"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Event synopsis or concert details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="MOVIE">Movie / Cinema</option>
                <option value="CONCERT">Live Concert</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Venue Layout *</label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.totalCapacity} Seats)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Show Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={showTime}
                onChange={(e) => setShowTime(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Mins)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Pricing Tiers */}
            <div className="sm:col-span-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                Category Pricing ($)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[11px] text-amber-400 font-semibold">VIP Price</span>
                  <input
                    type="number"
                    step="0.5"
                    value={vipPrice}
                    onChange={(e) => setVipPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs mt-1"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-cyan-400 font-semibold">Premium Price</span>
                  <input
                    type="number"
                    step="0.5"
                    value={premiumPrice}
                    onChange={(e) => setPremiumPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs mt-1"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-indigo-400 font-semibold">Standard Price</span>
                  <input
                    type="number"
                    step="0.5"
                    value={standardPrice}
                    onChange={(e) => setStandardPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hold TTL (Minutes)</label>
              <input
                type="number"
                value={holdTtlMinutes}
                onChange={(e) => setHoldTtlMinutes(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Image URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs"
              />
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-400 pt-1">{formError}</p>
          )}

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-500/20"
            >
              {creating ? 'Generating Venue Seats...' : 'Publish Event'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
