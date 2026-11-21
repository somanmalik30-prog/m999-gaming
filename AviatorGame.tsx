import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Plane,
  Plus,
  Minus,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';
import { UserProfile } from '../types';

interface AviatorGameProps {
  variantTitle: string;
  token: string | null;
  user: UserProfile | null;
  onBalanceChange: (newBalance: number) => void;
  onOpenDeposit: () => void;
  onRequireAuth: () => void;
  onBack: () => void;
}

type RoundPhase = 'BETTING' | 'FLYING' | 'CRASHED';

interface ServerAviatorState {
  roundId: number;
  phase: RoundPhase;
  countdown: number;
  multiplier: number;
  flightElapsedMs: number;
  crashedAt: number | null;
  history: number[];
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.08) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio context blocks
  }
}

export const AviatorGame: React.FC<AviatorGameProps> = ({
  variantTitle,
  token,
  user,
  onBalanceChange,
  onOpenDeposit,
  onRequireAuth,
  onBack,
}) => {
  const [roundId, setRoundId] = useState(1001);
  const [phase, setPhase] = useState<RoundPhase>('BETTING');
  const [countdown, setCountdown] = useState(5.0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState<number[]>([2.41, 1.38, 6.14, 1.09, 3.72, 1.85]);

  const [betAmount, setBetAmount] = useState(100);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoCashoutAt, setAutoCashoutAt] = useState('2.00');
  const [activeBetId, setActiveBetId] = useState<string | null>(null);
  const [activeBetRoundId, setActiveBetRoundId] = useState<number | null>(null);
  const [activeBetAmt, setActiveBetAmt] = useState(0);
  const [cashedOutMult, setCashedOutMult] = useState<number | null>(null);
  const [cashedOutPayout, setCashedOutPayout] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [soundOn, setSoundOn] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevPhaseRef = useRef<RoundPhase>('BETTING');
  const lastSyncRef = useRef<{ elapsedMs: number; syncedAt: number; phase: RoundPhase }>({
    elapsedMs: 0,
    syncedAt: performance.now(),
    phase: 'BETTING',
  });
  const activeBetRef = useRef<{
    id: string | null;
    roundId: number | null;
    amount: number;
    cashedOut: boolean;
  }>({
    id: null,
    roundId: null,
    amount: 0,
    cashedOut: false,
  });

  useEffect(() => {
    activeBetRef.current = {
      id: activeBetId,
      roundId: activeBetRoundId,
      amount: activeBetAmt,
      cashedOut: cashedOutMult !== null,
    };
  }, [activeBetId, activeBetRoundId, activeBetAmt, cashedOutMult]);

  const handleCashOut = useCallback(
    async (multValue: number) => {
      const current = activeBetRef.current;
      if (!current.id || current.cashedOut || !token) return;
      activeBetRef.current.cashedOut = true;
      setCashedOutMult(multValue);
      if (soundOn) playTone(880, 0.22, 'triangle', 0.12);

      try {
        const res = await fetch('/api/aviator/cashout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            betId: current.id,
            multiplier: multValue,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          const finalMult = Number(data.multiplier ?? multValue);
          setCashedOutMult(finalMult);
          setCashedOutPayout(data.payout);
          onBalanceChange(data.balance);
          setStatusMsg(`Won Rs ${Number(data.payout).toFixed(2)} at ${finalMult.toFixed(2)}x!`);
        } else {
          setStatusMsg(data.error || 'Cashout missed — plane flew away.');
        }
      } catch {
        setStatusMsg('Connection error on cashout.');
      }
    },
    [onBalanceChange, soundOn, token]
  );

  // Poll server-authoritative Aviator state
  useEffect(() => {
    let active = true;

    const syncState = async () => {
      try {
        const res = await fetch('/api/aviator/state');
        if (!res.ok || !active) return;
        const data = (await res.json()) as ServerAviatorState;

        setRoundId(data.roundId);
        setPhase(data.phase);
        setCountdown(data.countdown);
        setHistory(data.history);

        lastSyncRef.current = {
          elapsedMs: data.flightElapsedMs,
          syncedAt: performance.now(),
          phase: data.phase,
        };

        if (data.phase === 'CRASHED') {
          setMultiplier(data.crashedAt ?? data.multiplier);
        } else if (data.phase === 'BETTING') {
          setMultiplier(1.0);
        }

        // Phase transition sound & round reset
        if (prevPhaseRef.current !== data.phase) {
          if (data.phase === 'FLYING' && soundOn) {
            playTone(420, 0.18, 'sawtooth', 0.06);
          } else if (data.phase === 'CRASHED' && soundOn) {
            playTone(160, 0.28, 'sawtooth', 0.08);
          } else if (data.phase === 'BETTING') {
            setActiveBetId(null);
            setActiveBetRoundId(null);
            setActiveBetAmt(0);
            setCashedOutMult(null);
            setCashedOutPayout(null);
            setStatusMsg('');
          }
          prevPhaseRef.current = data.phase;
        }
      } catch {
        // Ignore transient poll error
      }
    };

    syncState();
    const interval = window.setInterval(syncState, 220);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [soundOn]);

  // Smooth 60fps flight multiplier interpolation while FLYING
  useEffect(() => {
    if (phase !== 'FLYING') return;
    let rafId = 0;

    const tick = (now: number) => {
      if (lastSyncRef.current.phase !== 'FLYING') return;
      const totalElapsedSec =
        (lastSyncRef.current.elapsedMs + (now - lastSyncRef.current.syncedAt)) / 1000;
      const interpMult = Number(Math.exp(0.115 * Math.max(0, totalElapsedSec)).toFixed(2));
      setMultiplier(interpMult);

      const autoTarget = Number(autoCashoutAt);
      if (
        autoCashoutEnabled &&
        Number.isFinite(autoTarget) &&
        autoTarget >= 1.05 &&
        interpMult >= autoTarget &&
        activeBetRef.current.id &&
        !activeBetRef.current.cashedOut
      ) {
        handleCashOut(autoTarget);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase, autoCashoutEnabled, autoCashoutAt, handleCashOut]);

  // Draw flight trajectory & plane on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (phase === 'BETTING') {
      return;
    }

    const progress =
      phase === 'CRASHED'
        ? 0.92
        : Math.min(0.92, Math.log(multiplier + 0.05) / 2.6 + 0.08);

    const startX = 24;
    const startY = h - 24;
    const endX = startX + (w - 64) * progress;
    const endY = startY - (h - 68) * Math.pow(progress, 0.85);
    const ctrlX = startX + (endX - startX) * 0.58;
    const ctrlY = startY;

    const grad = ctx.createLinearGradient(0, endY, 0, startY);
    grad.addColorStop(0, phase === 'CRASHED' ? 'rgba(225,29,72,0.38)' : 'rgba(239,68,68,0.34)');
    grad.addColorStop(1, 'rgba(239,68,68,0.02)');

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.lineTo(endX, startY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (phase === 'FLYING') {
      ctx.save();
      ctx.translate(endX, endY);
      ctx.rotate(-0.28);

      ctx.fillStyle = '#E11D48';
      ctx.beginPath();
      ctx.moveTo(-22, 4);
      ctx.lineTo(14, -2);
      ctx.lineTo(24, 2);
      ctx.lineTo(12, 8);
      ctx.lineTo(-18, 9);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FB7185';
      ctx.beginPath();
      ctx.moveTo(-4, 2);
      ctx.lineTo(6, -12);
      ctx.lineTo(11, -10);
      ctx.lineTo(4, 2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-20, 4);
      ctx.lineTo(-26, -7);
      ctx.lineTo(-18, -5);
      ctx.lineTo(-14, 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFE4E6';
      ctx.fillRect(23, -8, 2.5, 18);
      ctx.restore();
    }
  }, [phase, multiplier]);

  const handlePlaceBet = async () => {
    if (!token || !user) {
      onRequireAuth();
      return;
    }
    if (phase !== 'BETTING' || activeBetId) return;
    setStatusMsg('');

    try {
      const res = await fetch('/api/aviator/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: betAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(data.error || 'Could not place bet.');
        return;
      }
      setActiveBetId(data.betId);
      setActiveBetRoundId(data.roundId ?? roundId);
      setActiveBetAmt(betAmount);
      onBalanceChange(data.balance);
      if (soundOn) playTone(620, 0.1, 'sine', 0.08);
    } catch {
      setStatusMsg('Network error placing bet.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E12] text-white">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#14161D]/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#1C1F28] text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <Plane className="h-4 w-4 text-[#F43F5E]" />
              <span className="font-display text-base font-extrabold italic tracking-tight text-[#F43F5E]">
                Aviator
              </span>
              <span className="text-xs font-semibold text-zinc-400">
                · {variantTitle} · #{roundId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            aria-label="Toggle sound"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#1C1F28] text-zinc-300"
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onOpenDeposit}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] px-3 text-xs font-bold text-[#111216]"
          >
            <Wallet className="h-3.5 w-3.5" />
            <span className="font-mono-num">
              Rs {user ? user.balance.toFixed(2) : '0.00'}
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-3 p-3 sm:p-4">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-xl border border-white/10 bg-[#15171F] px-3 py-2">
          {history.map((h, idx) => (
            <span
              key={`${h}-${idx}`}
              className={`font-mono-num shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                h >= 10
                  ? 'bg-amber-500/20 text-amber-300'
                  : h >= 2
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'bg-sky-500/15 text-sky-300'
              }`}
            >
              {h.toFixed(2)}x
            </span>
          ))}
        </div>

        <div className="relative h-64 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_bottom_left,#2a0b15,#0d0e12_65%)] sm:h-80">
          <canvas ref={canvasRef} className="h-full w-full" />

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {phase === 'BETTING' ? (
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#F2C94C]">
                  Round #{roundId} · Place Bets
                </p>
                <p className="font-mono-num mt-1 text-4xl font-extrabold text-white">
                  {countdown.toFixed(1)}s
                </p>
                <div className="mx-auto mt-3 h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-[#EF4444] transition-all duration-75"
                    style={{ width: `${Math.min(100, (countdown / 5.0) * 100)}%` }}
                  />
                </div>
              </div>
            ) : phase === 'FLYING' ? (
              <div className="text-center">
                <p className="font-mono-num text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_18px_rgba(239,68,68,0.5)] sm:text-6xl">
                  {multiplier.toFixed(2)}x
                </p>
                {cashedOutMult !== null && (
                  <p className="mt-2 rounded-full bg-emerald-500/20 px-4 py-1 text-xs font-bold text-emerald-300">
                    Cashed Out @ {cashedOutMult.toFixed(2)}x
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-400">
                  Flew Away!
                </p>
                <p className="font-mono-num mt-1 text-5xl font-black text-rose-500 sm:text-6xl">
                  {multiplier.toFixed(2)}x
                </p>
              </div>
            )}
          </div>
        </div>

        {statusMsg && (
          <div
            className={`rounded-xl border px-3.5 py-2.5 text-center text-xs font-semibold ${
              cashedOutPayout
                ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                : 'border-amber-500/35 bg-amber-500/15 text-amber-200'
            }`}
          >
            {statusMsg}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-[#15171F] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0D0E12] p-1.5">
                <button
                  type="button"
                  onClick={() => setBetAmount((v) => Math.max(10, v - 50))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1C1F28] text-white hover:bg-white/15"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={10}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value) || 10))}
                  className="w-28 bg-transparent text-center font-mono-num text-lg font-bold text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setBetAmount((v) => v + 50)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1C1F28] text-white hover:bg-white/15"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 500, 1000].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setBetAmount(chip)}
                    className={`h-9 rounded-lg border font-mono-num text-xs font-bold transition-colors ${
                      betAmount === chip
                        ? 'border-[#E5B84B] bg-[#E5B84B]/20 text-[#F2C94C]'
                        : 'border-white/10 bg-[#1C1F28] text-zinc-300'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:w-56">
              {phase === 'BETTING' ? (
                <button
                  type="button"
                  onClick={handlePlaceBet}
                  disabled={Boolean(activeBetId)}
                  className={`flex h-20 w-full flex-col items-center justify-center rounded-2xl font-display shadow-lg transition-transform active:scale-[0.98] ${
                    activeBetId
                      ? 'border border-emerald-500/40 bg-emerald-600/30 text-emerald-200'
                      : 'bg-gradient-to-b from-[#22C55E] to-[#15803D] text-white'
                  }`}
                >
                  <span className="text-base font-extrabold uppercase tracking-wide">
                    {activeBetId ? 'Bet Accepted' : !user ? 'Sign In to Bet' : 'Place Bet'}
                  </span>
                  <span className="font-mono-num text-xs opacity-90">
                    Rs {(activeBetId ? activeBetAmt : betAmount).toFixed(2)}
                  </span>
                </button>
              ) : phase === 'FLYING' && activeBetId && cashedOutMult === null ? (
                <button
                  type="button"
                  onClick={() => handleCashOut(multiplier)}
                  className="flex h-20 w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-[#F59E0B] to-[#D97706] font-display text-[#111216] shadow-lg transition-transform active:scale-[0.97]"
                >
                  <span className="text-base font-black uppercase">Cash Out</span>
                  <span className="font-mono-num text-sm font-bold">
                    Rs {(activeBetAmt * multiplier).toFixed(2)}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex h-20 w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#1C1F28] text-zinc-400"
                >
                  <span className="text-sm font-bold">
                    {cashedOutPayout
                      ? `Won Rs ${cashedOutPayout.toFixed(2)}`
                      : 'Wait for Next Round'}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
            <label className="flex cursor-pointer items-center gap-2 text-zinc-300">
              <input
                type="checkbox"
                checked={autoCashoutEnabled}
                onChange={(e) => setAutoCashoutEnabled(e.target.checked)}
                className="h-4 w-4 accent-[#E5B84B]"
              />
              Auto Cash Out at
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="1.1"
                value={autoCashoutAt}
                onChange={(e) => setAutoCashoutAt(e.target.value)}
                className="h-8 w-20 rounded-lg border border-white/10 bg-[#0D0E12] px-2 text-right font-mono-num text-xs text-white focus:border-[#E5B84B] focus:outline-none"
              />
              <span className="font-mono-num text-zinc-400">x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
