import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  ImagePlus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PaymentSettings, UserProfile } from '../types';

interface WalletModalProps {
  open: boolean;
  initialTab?: 'deposit' | 'withdraw';
  onClose: () => void;
  token: string | null;
  user: UserProfile | null;
  paymentSettings: PaymentSettings;
  onSuccess: () => void;
  onRequireAuth: () => void;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const maxDim = 960;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const WalletModal: React.FC<WalletModalProps> = ({
  open,
  initialTab = 'deposit',
  onClose,
  token,
  user,
  paymentSettings,
  onSuccess,
  onRequireAuth,
}) => {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>(initialTab);
  const [copied, setCopied] = useState(false);

  // Deposit state
  const [depAmount, setDepAmount] = useState('1000');
  const [senderName, setSenderName] = useState('');
  const [txRef, setTxRef] = useState('');
  const [screenshotData, setScreenshotData] = useState('');
  const [screenshotName, setScreenshotName] = useState('');

  // Withdraw state
  const [wdAmount, setWdAmount] = useState('500');
  const [wdMethod, setWdMethod] = useState('EasyPaisa');
  const [wdAccountName, setWdAccountName] = useState('');
  const [wdAccountNumber, setWdAccountNumber] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  React.useEffect(() => {
    if (open) {
      setTab(initialTab);
      setError('');
      setSuccessMsg('');
    }
  }, [open, initialTab]);

  if (!open) return null;

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(paymentSettings.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressImageFile(file);
      setScreenshotData(compressed);
      setScreenshotName(file.name);
    } catch {
      setError('Please select a valid PNG or JPG screenshot image.');
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) {
      onRequireAuth();
      return;
    }
    setError('');
    setSuccessMsg('');
    if (!screenshotData) {
      setError('Please upload your payment screenshot before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(depAmount),
          senderName: senderName || user.name,
          transactionRef: txRef,
          screenshotData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit deposit request.');
        setSubmitting(false);
        return;
      }
      setSuccessMsg(
        'Deposit request sent! Admin will verify your screenshot and add balance shortly.'
      );
      setTxRef('');
      setScreenshotData('');
      setScreenshotName('');
      onSuccess();
    } catch {
      setError('Network error while uploading screenshot.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) {
      onRequireAuth();
      return;
    }
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(wdAmount),
          method: wdMethod,
          accountName: wdAccountName,
          accountNumber: wdAccountNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Withdrawal request failed.');
        setSubmitting(false);
        return;
      }
      setSuccessMsg(
        'Withdrawal request submitted! Amount is reserved and will be sent manually by Admin.'
      );
      setWdAccountName('');
      setWdAccountNumber('');
      onSuccess();
    } catch {
      setError('Network error while submitting withdrawal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#E5B84B]/20 bg-[#181A20] p-5 shadow-2xl sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Manual Wallet</h2>
            <p className="text-xs text-zinc-400">
              Balance:{' '}
              <span className="font-mono-num font-bold text-[#F2C94C]">
                Rs {user ? user.balance.toFixed(2) : '0.00'}
              </span>
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

        {/* Tab switcher */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#111216] p-1">
          <button
            type="button"
            onClick={() => {
              setTab('deposit');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg text-xs font-bold transition-colors ${
              tab === 'deposit'
                ? 'bg-gradient-to-r from-[#F2C94C] to-[#D99B26] text-[#111216]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="h-4 w-4" />
            Deposit (+5%)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('withdraw');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg text-xs font-bold transition-colors ${
              tab === 'withdraw'
                ? 'bg-gradient-to-r from-[#F2C94C] to-[#D99B26] text-[#111216]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="h-4 w-4" />
            Withdraw
          </button>
        </div>

        {tab === 'deposit' ? (
          <form onSubmit={handleDepositSubmit} className="mt-4 space-y-4">
            {/* Admin Account Card (Name & Number set in Admin Panel) */}
            <div className="rounded-xl border border-[#E5B84B]/30 bg-[#111216] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F2C94C]">
                  {paymentSettings.paymentMethod}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified Account
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Account Name</span>
                  <span className="font-semibold text-white">
                    {paymentSettings.accountName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num text-sm font-bold text-[#F2C94C]">
                      {paymentSettings.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className="flex h-7 items-center gap-1 rounded-lg bg-[#E5B84B]/15 px-2 text-[11px] font-semibold text-[#F2C94C] hover:bg-[#E5B84B]/25"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {paymentSettings.instructions && (
                <p className="mt-3 border-t border-white/10 pt-2.5 text-[11px] leading-relaxed text-zinc-400">
                  {paymentSettings.instructions}
                </p>
              )}
            </div>

            {/* Amount selection */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Deposit Amount (Min Rs {paymentSettings.minDeposit})
              </label>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepAmount(String(amt))}
                    className={`h-9 rounded-lg border text-xs font-semibold tabular-nums transition-colors ${
                      Number(depAmount) === amt
                        ? 'border-[#E5B84B] bg-[#E5B84B]/20 text-[#F2C94C]'
                        : 'border-white/10 bg-[#111216] text-zinc-300 hover:border-white/25'
                    }`}
                  >
                    Rs {amt.toLocaleString()}
                  </button>
                ))}
              </div>
              <input
                type="number"
                required
                min={paymentSettings.minDeposit}
                value={depAmount}
                onChange={(e) => setDepAmount(e.target.value)}
                placeholder="Enter custom amount"
                className="mt-2.5 h-11 w-full rounded-xl border border-white/10 bg-[#111216] px-3.5 font-mono-num text-sm text-white focus:border-[#E5B84B] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Your Sender Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder={user?.name || 'Sender account name'}
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#111216] px-3 text-xs text-white placeholder-zinc-500 focus:border-[#E5B84B] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Transaction ID / TID (Optional)
                </label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  placeholder="e.g. 849201948"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#111216] px-3 font-mono-num text-xs text-white placeholder-zinc-500 focus:border-[#E5B84B] focus:outline-none"
                />
              </div>
            </div>

            {/* Screenshot upload */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Upload Payment Screenshot *
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#E5B84B]/40 bg-[#111216] p-4 text-center transition-colors hover:border-[#E5B84B] hover:bg-[#111216]/80">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {screenshotData ? (
                  <div className="flex w-full items-center gap-3">
                    <img
                      src={screenshotData}
                      alt="Uploaded payment receipt"
                      className="h-16 w-16 rounded-lg border border-white/15 object-cover"
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-xs font-semibold text-emerald-400">
                        Screenshot Ready
                      </p>
                      <p className="truncate text-[11px] text-zinc-400">
                        {screenshotName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#F2C94C]">
                        Tap to change image
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImagePlus className="h-7 w-7 text-[#F2C94C]" />
                    <span className="mt-1.5 text-xs font-semibold text-white">
                      Tap to Upload Payment Screenshot
                    </span>
                    <span className="mt-0.5 text-[11px] text-zinc-400">
                      JPG, PNG or WEBP receipt image
                    </span>
                  </>
                )}
              </label>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] font-display text-sm font-bold text-[#111216] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {submitting
                ? 'Submitting Request...'
                : !user
                ? 'Sign In to Submit Deposit'
                : 'Submit Deposit Request'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleWithdrawSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Receive Via
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {['EasyPaisa', 'JazzCash', 'SadaPay', 'Bank'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setWdMethod(m)}
                    className={`h-10 rounded-xl border text-xs font-semibold transition-colors ${
                      wdMethod === m
                        ? 'border-[#E5B84B] bg-[#E5B84B]/20 text-[#F2C94C]'
                        : 'border-white/10 bg-[#111216] text-zinc-300 hover:border-white/25'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Withdrawal Amount (Min Rs {paymentSettings.minWithdrawal})
              </label>
              <input
                type="number"
                required
                min={paymentSettings.minWithdrawal}
                value={wdAmount}
                onChange={(e) => setWdAmount(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#111216] px-3.5 font-mono-num text-sm text-white focus:border-[#E5B84B] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Your Account Holder Name
              </label>
              <input
                type="text"
                required
                value={wdAccountName}
                onChange={(e) => setWdAccountName(e.target.value)}
                placeholder="Name on your wallet/bank account"
                className="h-11 w-full rounded-xl border border-white/10 bg-[#111216] px-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#E5B84B] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Your Account / Mobile Number
              </label>
              <input
                type="text"
                required
                value={wdAccountNumber}
                onChange={(e) => setWdAccountNumber(e.target.value)}
                placeholder="03XX-XXXXXXX or IBAN"
                className="h-11 w-full rounded-xl border border-white/10 bg-[#111216] px-3.5 font-mono-num text-sm text-white placeholder-zinc-500 focus:border-[#E5B84B] focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] font-display text-sm font-bold text-[#111216] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {submitting
                ? 'Submitting...'
                : !user
                ? 'Sign In to Withdraw'
                : 'Request Manual Withdrawal'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
