import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Building,
  CheckCircle2,
  MapPin,
  Users,
  Eye,
} from 'lucide-react';
import { api } from '../services/api';
import { Venue, VenueRowLayout } from '../types';
import { Modal } from '../components/Modal';

export const AdminVenuePage: React.FC = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPreviewVenue, setSelectedPreviewVenue] = useState<Venue | null>(null);

  // New Venue Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [rows, setRows] = useState<VenueRowLayout[]>([
    { label: 'A', category: 'VIP', seatCount: 8 },
    { label: 'B', category: 'PREMIUM', seatCount: 10 },
    { label: 'C', category: 'STANDARD', seatCount: 12 },
  ]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const res = await api.getVenues();
      setVenues(res.venues || []);
    } catch (err) {
      console.error('Failed to load venues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleAddRow = () => {
    const nextChar = String.fromCharCode(65 + rows.length); // A, B, C...
    setRows([...rows, { label: nextChar, category: 'STANDARD', seatCount: 10 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: keyof VenueRowLayout, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || rows.length === 0) {
      setError('Please provide a venue name and at least one seating row');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await api.createVenue({
        name,
        address,
        city,
        layoutConfig: { rows },
      });

      setIsCreateModalOpen(false);
      setName('');
      setAddress('');
      setCity('');
      fetchVenues();
    } catch (err: any) {
      setError(err.message || 'Failed to create venue');
    } finally {
      setCreating(false);
    }
  };

  const totalCalculatedSeats = rows.reduce((sum, r) => sum + (Number(r.seatCount) || 0), 0);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white font-heading tracking-tight">
            Venue Management & Seating Architect
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build customized seating layouts with VIP, Premium, and Standard tier allocations.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Venue</span>
        </button>
      </div>

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => (
          <div
            key={venue.id}
            className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="p-2.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
                  <Building className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-900 text-slate-300 font-mono text-xs font-bold border border-slate-700">
                  {venue.totalCapacity} Total Seats
                </span>
              </div>

              <h3 className="text-lg font-bold text-white font-heading leading-tight">{venue.name}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {venue.city || 'Standard Hall'}
              </p>

              {/* Rows Preview Breakdown */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Layout Structure ({venue.layoutConfig?.rows?.length || 0} Rows)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {venue.layoutConfig?.rows?.map((r, i) => (
                    <span
                      key={i}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        r.category === 'VIP'
                          ? 'bg-amber-500/20 text-amber-300'
                          : r.category === 'PREMIUM'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {r.label}: {r.seatCount} seats ({r.category})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedPreviewVenue(venue)}
              className="mt-6 w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-800 flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> View Seating Grid Preview
            </button>
          </div>
        ))}
      </div>

      {/* Create Venue Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="🏛️ Configure Venue Seating Grid"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateVenue} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Venue Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Paramount Dolby Cinema"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">City / Region</label>
              <input
                type="text"
                placeholder="New York, NY"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row Layout Builder */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Seating Rows Configuration
                </h4>
                <span className="text-[11px] text-slate-400">
                  Total Capacity: <strong className="text-emerald-400 font-mono">{totalCalculatedSeats} Seats</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {rows.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800"
                >
                  <div className="w-16">
                    <span className="text-[10px] text-slate-500 block">Row Label</span>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => handleRowChange(idx, 'label', e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs font-bold text-center"
                    />
                  </div>

                  <div className="w-24">
                    <span className="text-[10px] text-slate-500 block">Seats Count</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={row.seatCount}
                      onChange={(e) =>
                        handleRowChange(idx, 'seatCount', parseInt(e.target.value || '1', 10))
                      }
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs font-bold text-center"
                    />
                  </div>

                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 block">Tier Category</span>
                    <select
                      value={row.category}
                      onChange={(e) => handleRowChange(idx, 'category', e.target.value)}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-semibold"
                    >
                      <option value="VIP">VIP (Gold Tier)</option>
                      <option value="PREMIUM">PREMIUM (Cyan Tier)</option>
                      <option value="STANDARD">STANDARD (Indigo Tier)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={rows.length <= 1}
                    className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30 transition mt-3.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

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
              {creating ? 'Saving Venue...' : 'Save Venue Layout'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Seating Grid Preview Modal */}
      <Modal
        isOpen={!!selectedPreviewVenue}
        onClose={() => setSelectedPreviewVenue(null)}
        title={`🏛️ ${selectedPreviewVenue?.name} - Layout Preview`}
        maxWidth="max-w-2xl"
      >
        {selectedPreviewVenue && (
          <div className="space-y-6 py-2">
            <div className="screen-curve mb-4" />
            <div className="space-y-2 flex flex-col items-center">
              {selectedPreviewVenue.layoutConfig?.rows?.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 justify-center">
                  <span className="w-6 font-mono font-bold text-xs text-slate-400 text-center">
                    {row.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: row.seatCount }).map((_, sIdx) => (
                      <div
                        key={sIdx}
                        className={`w-6 h-6 rounded-md font-mono text-[10px] font-bold flex items-center justify-center border ${
                          row.category === 'VIP'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : row.category === 'PREMIUM'
                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                            : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                        }`}
                      >
                        {sIdx + 1}
                      </div>
                    ))}
                  </div>
                  <span className="w-6 font-mono font-bold text-xs text-slate-400 text-center">
                    {row.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
