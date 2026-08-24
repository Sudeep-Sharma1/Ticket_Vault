import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Ticket,
  Calendar,
  Layers,
  Shield,
  QrCode,
  Mail,
  User,
  LogOut,
  Sparkles,
  ChevronDown,
  Activity,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EmailOutboxModal } from './EmailOutboxModal';
import { QRScannerModal } from './QRScannerModal';

export const Navbar: React.FC = () => {
  const { user, logout, quickSwitchUser, isAdmin, isOrganiser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOutboxOpen, setIsOutboxOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-extrabold tracking-tight font-heading text-white">
                    Ticket<span className="text-cyan-400">Vault</span>
                  </span>
                  <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    REAL-TIME
                  </span>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive('/')
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  Explore Events
                </Link>

                {user && (
                  <Link
                    to="/bookings"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive('/bookings')
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    My Bookings
                  </Link>
                )}

                {isOrganiser && (
                  <Link
                    to="/organiser"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                      isActive('/organiser')
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Organiser Dashboard
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    to="/admin/venues"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                      isActive('/admin/venues')
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Venue Builder
                  </Link>
                )}
              </nav>
            </div>

            {/* Right Action Tools */}
            <div className="flex items-center gap-3">
              {/* Quick Persona Switcher (Demo Feature for Interviewers) */}
              <div className="relative">
                <button
                  onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition"
                  title="Switch test role"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Role: <strong className="text-white">{user?.role || 'Guest'}</strong></span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showSwitchMenu && (
                  <div className="absolute right-0 mt-2 w-48 glass-panel-elevated rounded-xl border border-slate-700 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Quick Demo Persona
                    </div>
                    <button
                      onClick={() => {
                        quickSwitchUser('CUSTOMER');
                        setShowSwitchMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-slate-800/80 text-slate-200 flex items-center justify-between"
                    >
                      <span>👤 Customer (Alex)</span>
                      {user?.role === 'CUSTOMER' && <span className="text-[10px] text-indigo-400 font-bold">Active</span>}
                    </button>
                    <button
                      onClick={() => {
                        quickSwitchUser('ORGANISER');
                        setShowSwitchMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-slate-800/80 text-slate-200 flex items-center justify-between"
                    >
                      <span>🎬 Organiser (Apex)</span>
                      {user?.role === 'ORGANISER' && <span className="text-[10px] text-emerald-400 font-bold">Active</span>}
                    </button>
                    <button
                      onClick={() => {
                        quickSwitchUser('ADMIN');
                        setShowSwitchMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-slate-800/80 text-slate-200 flex items-center justify-between"
                    >
                      <span>🛡️ Admin (Root)</span>
                      {user?.role === 'ADMIN' && <span className="text-[10px] text-amber-400 font-bold">Active</span>}
                    </button>
                  </div>
                )}
              </div>

              {/* QR Scanner Tool */}
              <button
                onClick={() => setIsScannerOpen(true)}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                title="Verify Ticket / QR Scanner"
              >
                <QrCode className="w-4 h-4 text-cyan-400" />
              </button>

              {/* Email Outbox Tool */}
              <button
                onClick={() => setIsOutboxOpen(true)}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition relative"
                title="View In-App Email Outbox & QR Passes"
              >
                <Mail className="w-4 h-4 text-indigo-400" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              </button>

              {/* Auth User */}
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-semibold text-slate-200 leading-none">{user.name}</div>
                    <div className="text-[10px] text-slate-400">{user.email}</div>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-500/20"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Outbox & Scanner Modals */}
      <EmailOutboxModal isOpen={isOutboxOpen} onClose={() => setIsOutboxOpen(false)} />
      <QRScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    </>
  );
};
