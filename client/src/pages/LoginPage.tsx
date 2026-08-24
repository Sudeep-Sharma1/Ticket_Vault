import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Ticket, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, quickSwitchUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(redirect);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN') => {
    setLoading(true);
    setError(null);
    try {
      await quickSwitchUser(role);
      navigate(redirect);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel-elevated p-8 rounded-3xl border border-slate-800 shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/20">
            <Ticket className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading">Welcome to TicketVault</h1>
          <p className="text-xs text-slate-400 mt-1">Log in to manage holds, tickets, and waitlists</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Persona Shortcuts */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-2.5">
            ⚡ Quick 1-Click Demo Logins
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('CUSTOMER')}
              className="py-2 px-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-[11px] font-semibold transition"
            >
              👤 Customer
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('ORGANISER')}
              className="py-2 px-1 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700 rounded-xl text-[11px] font-semibold transition"
            >
              🎬 Organiser
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN')}
              className="py-2 px-1 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-xl text-[11px] font-semibold transition"
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:underline font-semibold">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
};
