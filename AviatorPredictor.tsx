import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ExternalLink,
  Lock,
  LogOut,
  Plane,
  RefreshCw,
  Shield,
  Sliders,
} from 'lucide-react';

interface AviatorPredictorProps {
  adminToken: string | null;
  onAdminTokenChange: (token: string | null) => void;
  onNavigateGame: () => void;
  onNavigateAdmin: () => void;
}

interface PredictorState {
  roundId: number;
  phase: 'BETTING' | 'FLYING' | 'CRASHED';
  countdown: number;
  multiplier: number;
  crashedAt: number | null;
  history: number[];
  activeRoundCrashPoint: number;
  nextRoundId: number;
  nextRoundCrashPoint: number;
  safeCashout: number;
  nextSafeCashout: number;
}

export const AviatorPredictor: React.FC<AviatorPredictorProps> = ({
  adminToken,
  onAdminTokenChange,
  onNavigateGame,
  onNavigateAdmin,
}) => {
  const [authConfigured, setAuthConfigured] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [state, setState] = useState<PredictorState | null>(null);
  const [customNext, setCustomNext] = useState('2.50');
  const [overrideMsg, setOverrideMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/auth-status')
      .then((r) => r.json())
      .then((d) => setAuthConfigured(Boolean(d.configured)))
      .catch(() => setAuthConfigured(true));
  }, []);

  const fetchPredictor = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin/aviator-predictor', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401 || res.status === 403) {
        onAdminTokenChange(null);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as PredictorState;
        setState(data);
      }
    } catch {
      // ignore transient error
    }
  }, [adminToken, onAdminTokenChange]);

  useEffect(() => {
    if (!adminToken) return;
    fetchPredictor();
    const timer = window.setInterval(fetchPredictor, 350);
    return () => clearInterval(timer);
  }, [adminToken, fetchPredictor]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authConfigured && passcode !== confirmPasscode) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthLoading(true);
    try {
      const endpoint = authConfigured ? '/api/admin/login' : '/api/admin/setup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        setAuthLoading(false);
        return;
      }
      onAdminTokenChange(data.token);
      setPasscode('');
      setConfirmPasscode('');
    } catch {
      setAuthError('Network error.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSetCrash = async (mult: number) => {
    if (!adminToken) return;
    setOverrideMsg('');
    const res = await fetch('/api/admin/aviator-override', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ crashMultiplier: mult }),
    });
    const data = await res.json();
    if (res.ok) {
      setState(data);
      setOverrideMsg(`Next signal locked to ${mult.toFixed(2)}x`);
    } else {
      setOverrideMsg(data.error || 'Could not update multiplier.');
    }
  };

  if (!adminToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D12] p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/25 bg-[#141720] p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
              <Plane className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white">
                M999 Aviator Predictor
              </h1>
              <p className="text-xs text-zinc-400">
                {authConfigured === false
                  ? 'Set your Admin Password to unlock live Aviator signals.'
                  : 'Enter your Admin Password to view live round crash predictions.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter admin password"
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] pr-3 pl-10 text-sm text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {authConfigured === false && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Re-enter password"
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] pr-3 pl-10 text-sm text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {authError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || authConfigured === null}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-[#EF4444] to-[#E11D48] font-display text-sm font-bold text-white shadow-lg"
            >
              {authLoading ? 'Unlocking...' : 'Open Aviator Predictor'}
            </button>
          </form>

          <div className="mt-5 flex justify-center gap-4 border-t border-white/10 pt-4 text-xs">
            <button
              type="button"
              onClick={onNavigateGame}
              className="text-zinc-400 hover:text-[#F2C94C]"
            >
              Game App
            </button>
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="text-zinc-400 hover:text-[#F2C94C]"
            >
              Admin Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D12] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#141720]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-white">
                M999 Aviator Predictor
              </h1>
              <p className="text-[11px] text-zinc-400">
                Synced Live with M999 Aviator Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNavigateGame}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-[#1B1F2B] px-3 text-xs font-semibold text-zinc-200 hover:bg-white/10"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Game</span>
            </button>
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-[#E5B84B]/40 bg-[#E5B84B]/10 px-3 text-xs font-semibold text-[#F2C94C]"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => onAdminTokenChange(null)}
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#1B1F2B] text-zinc-400 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 p-4">
        {/* Main Live Signal Radar */}
        <div className="rounded-2xl border border-rose-500/30 bg-[radial-gradient(circle_at_top,#350d18,#141720_70%)] p-6 text-center shadow-xl">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-rose-300">
            <Activity className="h-4 w-4" />
            <span>
              Round #{state?.roundId ?? '...'} · {state?.phase ?? 'SYNCING'}
            </span>
          </div>

          <p className="mt-4 text-xs text-zinc-400">Exact Current Round Crash Point</p>
          <p className="font-mono-num mt-1 text-6xl font-black tracking-tight text-white drop-shadow-[0_0_24px_rgba(244,63,94,0.65)]">
            {state ? `${state.activeRoundCrashPoint.toFixed(2)}x` : '--'}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
              <span className="text-zinc-400">Safe Cashout Target: </span>
              <strong className="font-mono-num text-emerald-300">
                {state ? `${state.safeCashout.toFixed(2)}x` : '--'}
              </strong>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0B0D12]/70 px-4 py-2">
              <span className="text-zinc-400">Live Game Value: </span>
              <strong className="font-mono-num text-[#F2C94C]">
                {state
                  ? state.phase === 'BETTING'
                    ? `Starting in ${state.countdown.toFixed(1)}s`
                    : `${state.multiplier.toFixed(2)}x`
                  : '--'}
              </strong>
            </div>
          </div>
        </div>

        {/* Next Round Preview + Manual Signal Control */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#141720] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-white">
                Upcoming Round #{state?.nextRoundId ?? '...'}
              </h2>
              <RefreshCw className="h-4 w-4 text-zinc-500" />
            </div>
            <p className="font-mono-num mt-3 text-4xl font-extrabold text-[#F2C94C]">
              {state ? `${state.nextRoundCrashPoint.toFixed(2)}x` : '--'}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Suggested Cashout:{' '}
              <strong className="font-mono-num text-emerald-400">
                {state ? `${state.nextSafeCashout.toFixed(2)}x` : '--'}
              </strong>
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#141720] p-5">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#F2C94C]" />
              <h2 className="font-display text-sm font-bold text-white">
                Control Next Multiplier
              </h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1.5, 2.0, 3.5, 5.0, 10.0].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSetCrash(m)}
                  className="h-8 rounded-lg border border-white/10 bg-[#0B0D12] px-2.5 font-mono-num text-xs font-bold text-zinc-200 hover:border-[#F2C94C] hover:text-[#F2C94C]"
                >
                  {m.toFixed(1)}x
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                step="0.05"
                min="1"
                max="100"
                value={customNext}
                onChange={(e) => setCustomNext(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-white/10 bg-[#0B0D12] px-3 font-mono-num text-xs text-white focus:border-[#E5B84B] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSetCrash(Number(customNext))}
                className="h-9 rounded-lg bg-[#E5B84B] px-3 text-xs font-bold text-[#111216]"
              >
                Lock Signal
              </button>
            </div>
            {overrideMsg && (
              <p className="mt-2 text-xs font-semibold text-emerald-400">{overrideMsg}</p>
            )}
          </div>
        </div>

        {/* Recent History */}
        <div className="rounded-2xl border border-white/10 bg-[#141720] p-4">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-zinc-400">
            Recent Aviator Crash History
          </h3>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {(state?.history ?? []).map((h, i) => (
              <span
                key={`${h}-${i}`}
                className={`font-mono-num rounded-lg px-3 py-1 text-xs font-bold ${
                  h >= 10
                    ? 'bg-amber-500/20 text-amber-300'
                    : h >= 2
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-rose-500/15 text-rose-300'
                }`}
              >
                {h.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
