import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  Lock,
  LogOut,
  Plane,
  RefreshCw,
  Settings,
  Shield,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { AdminDashboardData, DepositRequest, WithdrawalRequest } from '../types';

interface AdminPanelProps {
  adminToken: string | null;
  onAdminTokenChange: (token: string | null) => void;
  onNavigateGame: () => void;
  onNavigatePredictor: () => void;
}

type AdminTab = 'deposits' | 'withdrawals' | 'settings' | 'users';
type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  adminToken,
  onAdminTokenChange: setAdminToken,
  onNavigateGame,
  onNavigatePredictor,
}) => {
  const [authConfigured, setAuthConfigured] = useState<boolean | null>(null);
  const [envOverride, setEnvOverride] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [tab, setTab] = useState<AdminTab>('deposits');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending');
  const [loadingData, setLoadingData] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Payment settings form
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [instructions, setInstructions] = useState('');
  const [minDeposit, setMinDeposit] = useState('100');
  const [minWithdrawal, setMinWithdrawal] = useState('500');
  const [savingSettings, setSavingSettings] = useState(false);

  // Change admin password form
  const [currentAdminPass, setCurrentAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmNewAdminPass, setConfirmNewAdminPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passErrorMsg, setPassErrorMsg] = useState('');
  const [passSuccessMsg, setPassSuccessMsg] = useState('');

  // Balance adjustment state
  const [adjustDelta, setAdjustDelta] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/admin/auth-status')
      .then((r) => r.json())
      .then((d) => {
        setAuthConfigured(Boolean(d.configured));
        setEnvOverride(Boolean(d.envOverride));
      })
      .catch(() => setAuthConfigured(true));
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!adminToken) return;
    setLoadingData(true);
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status === 401 || res.status === 403) {
        setAdminToken(null);
        return;
      }
      const data = (await res.json()) as AdminDashboardData;
      setDashboard(data);
      setAccountName((prev) => prev || data.paymentSettings.accountName);
      setAccountNumber((prev) => prev || data.paymentSettings.accountNumber);
      setPaymentMethod((prev) => prev || data.paymentSettings.paymentMethod);
      setInstructions((prev) => prev || data.paymentSettings.instructions);
      setMinDeposit(String(data.paymentSettings.minDeposit));
      setMinWithdrawal(String(data.paymentSettings.minWithdrawal));
    } finally {
      setLoadingData(false);
    }
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken) return;
    fetchDashboard();
    const timer = window.setInterval(fetchDashboard, 5000);
    return () => clearInterval(timer);
  }, [adminToken, fetchDashboard]);

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
      setAdminToken(data.token);
      setPasscode('');
      setConfirmPasscode('');
    } catch {
      setAuthError('Network error.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleReviewDeposit = async (dep: DepositRequest, decision: 'approved' | 'rejected') => {
    if (!adminToken) return;
    setActionMsg('');
    const res = await fetch(`/api/admin/deposits/${dep.id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ decision, adminNote: '' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionMsg(data.error || 'Action failed.');
      return;
    }
    setActionMsg(
      decision === 'approved'
        ? `Approved Rs ${dep.amount.toFixed(2)} for ${dep.userName}. Balance added!`
        : `Rejected deposit request for ${dep.userName}.`
    );
    await fetchDashboard();
  };

  const handleReviewWithdrawal = async (
    wd: WithdrawalRequest,
    decision: 'approved' | 'rejected'
  ) => {
    if (!adminToken) return;
    setActionMsg('');
    const res = await fetch(`/api/admin/withdrawals/${wd.id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ decision, adminNote: '' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionMsg(data.error || 'Action failed.');
      return;
    }
    setActionMsg(
      decision === 'approved'
        ? `Marked Rs ${wd.amount.toFixed(2)} withdrawal as Paid.`
        : `Rejected withdrawal and refunded Rs ${wd.amount.toFixed(2)} to ${wd.userName}.`
    );
    await fetchDashboard();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSavingSettings(true);
    setActionMsg('');
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          accountName,
          accountNumber,
          paymentMethod,
          instructions,
          minDeposit: Number(minDeposit),
          minWithdrawal: Number(minWithdrawal),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMsg(data.error || 'Failed to save payment settings.');
      } else {
        setActionMsg('Payment name & number updated! Now live on the Game Deposit page.');
        await fetchDashboard();
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setPassErrorMsg('');
    setPassSuccessMsg('');

    if (newAdminPass.trim().length < 6) {
      setPassErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newAdminPass !== confirmNewAdminPass) {
      setPassErrorMsg('New password and confirmation do not match.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          currentPassword: currentAdminPass,
          newPassword: newAdminPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassErrorMsg(data.error || 'Failed to update admin password.');
        return;
      }
      if (data.token) {
        setAdminToken(data.token);
      }
      setCurrentAdminPass('');
      setNewAdminPass('');
      setConfirmNewAdminPass('');
      setPassSuccessMsg('Admin password changed successfully!');
    } catch {
      setPassErrorMsg('Network error. Please try again.');
    } finally {
      setChangingPass(false);
    }
  };

  const handleAdjustBalance = async (userId: string) => {
    if (!adminToken) return;
    const raw = Number(adjustDelta[userId]);
    if (!Number.isFinite(raw) || raw === 0) return;
    const res = await fetch(`/api/admin/users/${userId}/adjust-balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ delta: raw }),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionMsg(data.error || 'Adjustment failed.');
      return;
    }
    setAdjustDelta((prev) => ({ ...prev, [userId]: '' }));
    setActionMsg(`Updated balance for ${data.user.name}.`);
    await fetchDashboard();
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  // Admin Sign-In / First-Run Setup Gate
  if (!adminToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D12] p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141720] p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E5B84B]/15 text-[#F2C94C]">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white">
                {authConfigured === false ? 'Create Admin Password' : 'M999 Admin Console'}
              </h1>
              <p className="text-xs text-zinc-400">
                {authConfigured === false
                  ? 'First-time setup: choose a secure password for your Admin Panel.'
                  : 'Sign in to approve deposits, withdrawals, and update payment details.'}
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
                  placeholder="Minimum 6 characters"
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] pr-3 pl-10 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
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
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] pr-3 pl-10 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
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
              className="h-12 w-full rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] font-display text-sm font-bold text-[#111216] shadow-lg transition-transform active:scale-[0.98]"
            >
              {authLoading
                ? 'Verifying...'
                : authConfigured === false
                ? 'Save Password & Enter Admin Panel'
                : 'Sign In to Admin Panel'}
            </button>
          </form>

          <div className="mt-5 border-t border-white/10 pt-4 text-center">
            <button
              type="button"
              onClick={onNavigateGame}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-[#F2C94C]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Player Game Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredDeposits = (dashboard?.deposits ?? []).filter((d) =>
    statusFilter === 'all' ? true : d.status === statusFilter
  );
  const filteredWithdrawals = (dashboard?.withdrawals ?? []).filter((w) =>
    statusFilter === 'all' ? true : w.status === statusFilter
  );

  return (
    <div className="min-h-screen bg-[#0B0D12] text-white">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#141720]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5B84B] font-display text-sm font-black text-[#111216]">
              M9
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-white">
                M999 Admin Operations
              </h1>
              <p className="text-[11px] text-zinc-400">
                Manual Deposit Approvals, Withdrawals &amp; Account Settings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDashboard}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-[#1B1F2B] px-3 text-xs font-semibold text-zinc-200 hover:bg-white/10"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onNavigatePredictor}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 text-xs font-semibold text-rose-300 hover:bg-rose-500/25"
            >
              <Plane className="h-3.5 w-3.5" />
              <span>Predictor</span>
            </button>
            <button
              type="button"
              onClick={onNavigateGame}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-[#E5B84B]/40 bg-[#E5B84B]/10 px-3 text-xs font-semibold text-[#F2C94C] hover:bg-[#E5B84B]/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Game App</span>
            </button>
            <button
              type="button"
              onClick={() => setAdminToken(null)}
              aria-label="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#1B1F2B] text-zinc-400 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-4">
        {/* KPI Summary Grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-[#141720] p-4">
            <p className="text-xs text-zinc-400">Pending Deposits</p>
            <p className="font-mono-num mt-1 text-2xl font-bold text-[#F2C94C]">
              {dashboard?.stats.pendingDeposits ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141720] p-4">
            <p className="text-xs text-zinc-400">Pending Withdrawals</p>
            <p className="font-mono-num mt-1 text-2xl font-bold text-amber-400">
              {dashboard?.stats.pendingWithdrawals ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141720] p-4">
            <p className="text-xs text-zinc-400">Approved Deposits</p>
            <p className="font-mono-num mt-1 text-2xl font-bold text-emerald-400">
              Rs {(dashboard?.stats.totalApprovedDeposits ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#141720] p-4">
            <p className="text-xs text-zinc-400">Registered Players</p>
            <p className="font-mono-num mt-1 text-2xl font-bold text-white">
              {dashboard?.stats.totalUsers ?? 0}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-xl bg-[#141720] p-1 border border-white/10">
            {(
              [
                { id: 'deposits', label: 'Deposits', icon: CreditCard, count: dashboard?.stats.pendingDeposits },
                { id: 'withdrawals', label: 'Withdrawals', icon: ExternalLink, count: dashboard?.stats.pendingWithdrawals },
                { id: 'settings', label: 'My Name & Number', icon: Settings },
                { id: 'users', label: 'Players', icon: Users },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setActionMsg('');
                  }}
                  className={`flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#E5B84B] text-[#111216]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                  {'count' in item && typeof item.count === 'number' && item.count > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-bold ${
                        active ? 'bg-[#111216] text-[#F2C94C]' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {(tab === 'deposits' || tab === 'withdrawals') && (
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#141720] p-1">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold capitalize ${
                    statusFilter === f
                      ? 'bg-white/15 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {actionMsg && (
          <div className="rounded-xl border border-[#E5B84B]/40 bg-[#E5B84B]/10 px-4 py-2.5 text-xs font-semibold text-[#FDE047]">
            {actionMsg}
          </div>
        )}

        {/* Tab 1: Deposit Requests Queue */}
        {tab === 'deposits' && (
          <div className="space-y-3">
            {filteredDeposits.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#141720] p-10 text-center text-sm text-zinc-400">
                No {statusFilter === 'all' ? '' : statusFilter} deposit requests right now.
              </div>
            ) : (
              filteredDeposits.map((dep) => (
                <div
                  key={dep.id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#141720] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => setPreviewImg(dep.screenshotData)}
                      className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black"
                    >
                      <img
                        src={dep.screenshotData}
                        alt={`Receipt from ${dep.userName}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                        <Eye className="h-5 w-5 text-white" />
                      </span>
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-num text-lg font-extrabold text-[#F2C94C]">
                          Rs {dep.amount.toFixed(2)}
                        </span>
                        <span
                          className={`text-xs font-semibold capitalize ${
                            dep.status === 'approved'
                              ? 'text-emerald-400'
                              : dep.status === 'rejected'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          · {dep.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white">
                        {dep.userName}{' '}
                        <span className="font-mono-num text-zinc-400">({dep.userPhone})</span>
                      </p>
                      <p className="text-xs text-zinc-400">
                        Sender: {dep.senderName}
                        {dep.transactionRef ? ` · TID: ${dep.transactionRef}` : ''}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {new Date(dep.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewImg(dep.screenshotData)}
                      className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-[#1B1F2B] px-3 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                    >
                      <Eye className="h-4 w-4" />
                      View Receipt
                    </button>

                    {dep.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReviewDeposit(dep, 'approved')}
                          className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-[#07190E] hover:bg-emerald-400"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Accept &amp; Add Balance
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewDeposit(dep, 'rejected')}
                          className="flex h-10 items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Withdrawal Requests Queue */}
        {tab === 'withdrawals' && (
          <div className="space-y-3">
            {filteredWithdrawals.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#141720] p-10 text-center text-sm text-zinc-400">
                No {statusFilter === 'all' ? '' : statusFilter} withdrawal requests right now.
              </div>
            ) : (
              filteredWithdrawals.map((wd) => (
                <div
                  key={wd.id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#141720] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num text-lg font-extrabold text-white">
                        Rs {wd.amount.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-[#F2C94C]">· {wd.method}</span>
                      <span
                        className={`text-xs font-semibold capitalize ${
                          wd.status === 'approved'
                            ? 'text-emerald-400'
                            : wd.status === 'rejected'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        · {wd.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300">
                      Player: <strong>{wd.userName}</strong> ({wd.userPhone})
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                      <span>
                        Send To: <strong>{wd.accountName}</strong> —{' '}
                        <span className="font-mono-num font-bold text-[#F2C94C]">
                          {wd.accountNumber}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(wd.id, wd.accountNumber)}
                        className="inline-flex h-6 items-center gap-1 rounded bg-white/10 px-2 text-[11px] text-white"
                      >
                        {copiedId === wd.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      {new Date(wd.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {wd.status === 'pending' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReviewWithdrawal(wd, 'approved')}
                        className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-[#07190E] hover:bg-emerald-400"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewWithdrawal(wd, 'rejected')}
                        className="flex h-10 items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject &amp; Refund
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Admin Name, Number & Security Settings */}
        {tab === 'settings' && (
          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
            <form
              onSubmit={handleSaveSettings}
              className="space-y-4 rounded-2xl border border-white/10 bg-[#141720] p-5"
            >
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Manual Deposit Account Details
                </h2>
                <p className="text-xs text-zinc-400">
                  This Name and Number is displayed to all players on the Deposit screen.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Your Name (Account Holder Name)
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3.5 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Your Account / Wallet Number
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3.5 font-mono-num text-sm text-white focus:border-[#E5B84B] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Payment Method Label
                </label>
                <input
                  type="text"
                  required
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g. EasyPaisa / JazzCash / Bank"
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3.5 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Min Deposit (Rs)
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={minDeposit}
                    onChange={(e) => setMinDeposit(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3.5 font-mono-num text-sm text-white focus:border-[#E5B84B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Min Withdrawal (Rs)
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={minWithdrawal}
                    onChange={(e) => setMinWithdrawal(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3.5 font-mono-num text-sm text-white focus:border-[#E5B84B] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                  Deposit Instructions
                </label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0B0D12] p-3 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="h-11 rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] px-6 font-display text-sm font-bold text-[#111216] shadow-lg"
              >
                {savingSettings ? 'Saving...' : 'Save Payment Details'}
              </button>
            </form>

            <form
              onSubmit={handleChangeAdminPassword}
              className="space-y-4 rounded-2xl border border-white/10 bg-[#141720] p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5B84B]/15 text-[#F2C94C]">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-white">
                    Change Admin Password
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Update the password used for both Admin Panel (/admin) and Aviator Predictor (/predictor).
                  </p>
                </div>
              </div>

              {envOverride ? (
                <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
                  <p className="font-bold text-amber-300">Managed by ADMIN_PASSCODE Secret</p>
                  <p className="mt-1">
                    Your project currently has <code className="font-mono">ADMIN_PASSCODE</code> set in environment secrets, which overrides the in-app password. To change it, update <code className="font-mono">ADMIN_PASSCODE</code> in AI Studio Settings → Secrets (or remove it to manage your password directly here).
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentAdminPass}
                      onChange={(e) => setCurrentAdminPass(e.target.value)}
                      placeholder="Enter your current admin password"
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3.5 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3.5 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewAdminPass}
                      onChange={(e) => setConfirmNewAdminPass(e.target.value)}
                      placeholder="Re-enter new password"
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0D12] px-3.5 text-sm text-white focus:border-[#E5B84B] focus:outline-none"
                    />
                  </div>

                  {passErrorMsg && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-300">
                      {passErrorMsg}
                    </div>
                  )}

                  {passSuccessMsg && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-300">
                      {passSuccessMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={changingPass}
                    className="h-11 rounded-xl border border-[#E5B84B]/50 bg-[#E5B84B]/15 px-6 font-display text-sm font-bold text-[#F2C94C] transition-colors hover:bg-[#E5B84B]/25 disabled:opacity-60"
                  >
                    {changingPass ? 'Updating Password...' : 'Update Admin Password'}
                  </button>
                </>
              )}
            </form>
          </div>
        )}

        {/* Tab 4: Players & Balances */}
        {tab === 'users' && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#141720]">
            {(dashboard?.users ?? []).length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-400">
                No registered players yet.
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {(dashboard?.users ?? []).map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{u.name}</p>
                      <p className="font-mono-num text-xs text-zinc-400">
                        {u.phone} · Joined {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono-num text-base font-extrabold text-[#F2C94C]">
                        Rs {u.balance.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder="+/- Rs"
                          value={adjustDelta[u.id] ?? ''}
                          onChange={(e) =>
                            setAdjustDelta((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                          className="h-9 w-24 rounded-lg border border-white/10 bg-[#0B0D12] px-2.5 font-mono-num text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleAdjustBalance(u.id)}
                          className="h-9 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
                        >
                          Adjust
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fullscreen Receipt Screenshot Lightbox */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImg(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImg(null)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={previewImg}
            alt="Deposit payment receipt"
            className="max-h-[88vh] max-w-full rounded-xl border border-white/20 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
