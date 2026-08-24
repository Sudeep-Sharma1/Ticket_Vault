import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import { api } from '../services/api';
import { EmailLogItem } from '../types';
import { Modal } from './Modal';

interface EmailOutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailOutboxModal: React.FC<EmailOutboxModalProps> = ({ isOpen, onClose }) => {
  const [emails, setEmails] = useState<EmailLogItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailLogItem | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOutbox = async () => {
    setLoading(true);
    try {
      const res = await api.getEmailOutbox();
      setEmails(res.emails || []);
      if (res.emails && res.emails.length > 0 && !selectedEmail) {
        setSelectedEmail(res.emails[0]);
      }
    } catch (err) {
      console.error('Failed to load email outbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOutbox();
    }
  }, [isOpen]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'BOOKING_CONFIRMATION':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Confirmation</span>;
      case 'WAITLIST_OFFER':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">Waitlist Offer</span>;
      case 'CANCELLATION_NOTICE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">Cancellation</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-700 text-slate-300">{type}</span>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📧 In-App Email Outbox & Notification Center" maxWidth="max-w-4xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <p className="text-xs text-slate-400">
          Inspect generated QR ticket emails and time-limited waitlist offer notifications in real time.
        </p>
        <button
          onClick={fetchOutbox}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {emails.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No emails logged yet. Book a ticket or trigger a waitlist offer to view notifications here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4 h-[480px]">
          {/* Email List */}
          <div className="md:col-span-5 border-r border-slate-800 pr-2 overflow-y-auto custom-scrollbar space-y-2">
            {emails.map((em) => (
              <div
                key={em.id}
                onClick={() => setSelectedEmail(em)}
                className={`p-3 rounded-xl cursor-pointer transition border text-left ${
                  selectedEmail?.id === em.id
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  {getTypeBadge(em.type)}
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(em.sentAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200 line-clamp-1">{em.subject}</div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">To: {em.recipientEmail}</div>
              </div>
            ))}
          </div>

          {/* Email Preview Pane */}
          <div className="md:col-span-7 pl-2 overflow-y-auto custom-scrollbar flex flex-col">
            {selectedEmail ? (
              <div className="space-y-3">
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="text-sm font-bold text-slate-100">{selectedEmail.subject}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    <span>Recipient: <strong className="text-indigo-400">{selectedEmail.recipientEmail}</strong></span> • 
                    <span className="ml-1">{new Date(selectedEmail.sentAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Rendered HTML */}
                <div
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-slate-200 text-sm"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.htmlContent }}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select an email from the left pane to preview its rendered content.
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
