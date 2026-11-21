import React, { useState } from 'react';
import { Lock, Phone, User, X } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (token: string, user: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  onAuthenticated,
  initialMode = 'register',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register' ? { name, phone, password } : { phone, password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        setLoading(false);
        return;
      }
      onAuthenticated(data.token, data.user);
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#E5B84B]/25 bg-[#181A20] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              {mode === 'register' ? 'Create M999 Account' : 'Sign In to M999'}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Your balance, deposits, and Aviator wins stay synced.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#111216] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
              mode === 'register'
                ? 'bg-[#E5B84B] text-[#111216]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
              mode === 'login'
                ? 'bg-[#E5B84B] text-[#111216]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Full Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#111216] pr-3 pl-10 text-sm text-white placeholder-zinc-500 focus:border-[#E5B84B] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03001234567"
                className="h-11 w-full rounded-xl border border-white/10 bg-[#111216] pr-3 pl-10 text-sm text-white placeholder-zinc-500 focus:border-[#E5B84B] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 4 characters"
                className="h-11 w-full rounded-xl border border-white/10 bg-[#111216] pr-3 pl-10 text-sm text-white placeholder-zinc-500 focus:border-[#E5B84B] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] font-display text-sm font-bold text-[#111216] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {loading
              ? 'Please wait...'
              : mode === 'register'
              ? 'Create Account & Play'
              : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
