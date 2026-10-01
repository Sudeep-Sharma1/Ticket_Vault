import React, { useState } from 'react';
import { CheckCircle2, XCircle, Search, User, MapPin, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { Modal } from './Modal';

// A pass carrying a genuine-looking payload but no valid server signature,
// used to demonstrate that edited/forged QR codes are rejected at the gate.
const FORGED_SAMPLE = `TV1.${btoa(
  JSON.stringify({ ref: 'TB-IN-VIP01', eid: 'forged', seats: ['A-1', 'A-2'], iat: 0, n: 'x' })
)
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '')}.Zm9yZ2VkLXNpZ25hdHVyZS10aGF0LXdpbGwtbm90LW1hdGNo`;

const REJECTION_TITLES: Record<string, string> = {
  FORGED: 'Forged or Unsigned Pass',
  REVOKED: 'Revoked Pass (Transferred)',
  ALREADY_CHECKED_IN: 'Ticket Already Used',
  CANCELLED: 'Ticket Cancelled',
  INVALID: 'Unknown Ticket',
};

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose }) => {
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const handleVerify = async (valToTest?: string) => {
    const val = valToTest || inputVal.trim();
    if (!val) return;

    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setResult(null);

    try {
      const isReference = /^TB-[A-Z0-9-]+$/i.test(val);
      const res = await api.verifyTicket(isReference ? { bookingReference: val } : { qrPayload: val });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Ticket verification failed');
      setErrorStatus(err.data?.status || null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputVal('');
    setResult(null);
    setError(null);
    setErrorStatus(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎟️ Ticket Verification & Entry Scanner" maxWidth="max-w-xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Paste a signed VaultPass (<code className="text-indigo-400">TV1.…</code>, copy it from any ticket) to verify its signature, or type a booking reference for a manual staff check-in.
        </p>

        {/* Input Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="TV1.… pass code or TB-XXXX-XXXX"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <button
            onClick={() => handleVerify()}
            disabled={loading || !inputVal.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-indigo-500/20"
          >
            {loading ? 'Verifying...' : 'Verify Entry'}
          </button>
        </div>

        {/* Quick Demo Test Buttons */}
        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
          <span>Quick test:</span>
          <button
            onClick={() => {
              setInputVal('TB-IN-VIP01');
              handleVerify('TB-IN-VIP01');
            }}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-md font-mono transition"
          >
            TB-IN-VIP01
          </button>
          <button
            onClick={() => {
              setInputVal(FORGED_SAMPLE);
              handleVerify(FORGED_SAMPLE);
            }}
            className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 rounded-md transition"
            title="Submit a QR whose payload looks real but whose signature was not issued by the server"
          >
            Forged QR
          </button>
        </div>

        {/* Results Display */}
        {result && (
          <div
            className={`p-5 rounded-2xl border mt-4 animate-in fade-in zoom-in-95 duration-200 ${
              result.status === 'VALID'
                ? 'bg-emerald-950/30 border-emerald-500/50'
                : 'bg-amber-950/30 border-amber-500/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-base font-bold text-emerald-300 font-heading">{result.message}</h4>
                <p className="text-xs text-slate-400">Reference: <strong className="font-mono text-white">{result.booking.bookingReference}</strong></p>
                {result.method === 'SIGNED_QR' ? (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-300">
                    <ShieldCheck className="w-3 h-3" /> HMAC-SHA256 signature verified
                  </span>
                ) : (
                  <span className="inline-block mt-1 text-[10px] font-bold text-amber-300">
                    Manual reference lookup: check attendee ID
                  </span>
                )}
              </div>
            </div>

            {/* Attendee & Event Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Attendee</span>
                <p className="font-semibold text-slate-200 mt-0.5">{result.booking.customerName}</p>
                <p className="text-slate-400">{result.booking.customerEmail}</p>
              </div>
              <div>
                <span className="text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Event & Venue</span>
                <p className="font-semibold text-slate-200 mt-0.5">{result.booking.event?.title}</p>
                <p className="text-slate-400">{result.booking.event?.venue?.name}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Allocated Seats:</span>
                <span className="font-bold text-indigo-300 font-mono px-2 py-0.5 bg-indigo-950/60 border border-indigo-500/30 rounded">
                  {result.booking.items?.map((it: any) => it.seatLabel).join(', ')}
                </span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Scan Next Ticket
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/50 flex items-start gap-3 mt-4 animate-in fade-in duration-200">
            {errorStatus === 'FORGED' || errorStatus === 'REVOKED' ? (
              <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-sm font-bold text-red-400">
                {(errorStatus && REJECTION_TITLES[errorStatus]) || 'Ticket Scan Rejected'}
              </h4>
              <p className="text-xs text-slate-300 mt-1">{error}</p>
              <button
                onClick={handleReset}
                className="mt-3 text-xs text-red-300 hover:underline"
              >
                Try another code
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
