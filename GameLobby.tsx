import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Flame,
  Gift,
  Headphones,
  Home,
  Inbox,
  Menu,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Volume2,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  LogOut,
  Check,
} from 'lucide-react';
import { GAMES } from '../data/games';
import {
  DepositRequest,
  GameCategory,
  GameItem,
  PaymentSettings,
  UserProfile,
  WithdrawalRequest,
} from '../types';
import { GameCardArt } from './GameCardArt';
import { PWAInstallButton } from './PWAInstallButton';

interface GameLobbyProps {
  user: UserProfile | null;
  paymentSettings: PaymentSettings;
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  onRefresh: () => Promise<void>;
  onOpenWallet: (tab: 'deposit' | 'withdraw') => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLaunchAviator: (game: GameItem) => void;
  onLogout: () => void;
}

type BottomTab = 'home' | 'promo' | 'invite' | 'support' | 'profile';

const PROMO_SLIDES = [
  {
    title: 'Lucky 9 Celebration',
    subtitle: 'On the 9th, 19th & 29th',
    highlight: 'OF EVERY MONTH CASH REWARDS',
    amount: 'Rs 10–1,000,000',
    badge: 'REWARD PAID',
  },
  {
    title: 'Manual Deposit +5% Bonus',
    subtitle: 'Instant Verification',
    highlight: 'UPLOAD SCREENSHOT & CLAIM',
    amount: 'Extra 5% Daily',
    badge: 'FAST PAY',
  },
  {
    title: 'Aviator Sky Jackpot',
    subtitle: 'Fly High & Cash Out',
    highlight: 'MULTIPLIERS UP TO 100X+',
    amount: 'Play Live Now',
    badge: 'LIVE GAME',
  },
];

const QUICK_BADGES = [
  { id: 'invite', title: 'INVITE A FRIEND', sub: 'GET RS 2,000', code: 'VIP', color: 'from-emerald-600 to-emerald-900' },
  { id: 'k666', title: 'K666', sub: 'Hot Club', code: 'K666', color: 'from-green-500 to-emerald-900' },
  { id: '666h', title: '666H', sub: 'Crash Hub', code: '666H', color: 'from-sky-500 to-blue-900' },
  { id: '999v', title: '999V', sub: 'VIP Slots', code: '999V', color: 'from-purple-500 to-indigo-900' },
  { id: '666c', title: '666C', sub: 'Sky Club', code: '666C', color: 'from-rose-500 to-red-900' },
];

export const GameLobby: React.FC<GameLobbyProps> = ({
  user,
  paymentSettings,
  deposits,
  withdrawals,
  onRefresh,
  onOpenWallet,
  onOpenAuth,
  onLaunchAviator,
  onLogout,
}) => {
  const [bottomTab, setBottomTab] = useState<BottomTab>('home');
  const [category, setCategory] = useState<GameCategory>('hot');
  const [slideIdx, setSlideIdx] = useState(0);
  const [favorites, setFavorites] = useState<string[]>(['aviator-wg']);
  const [pageOffset, setPageOffset] = useState(0);
  const [showAllInCategory, setShowAllInCategory] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleRefreshBalance = async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 450);
    showToast('Balance synced');
  };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredGames = useMemo(() => {
    const list =
      category === 'hot'
        ? GAMES
        : GAMES.filter((g) => g.category === category);
    if (showAllInCategory) return list;
    const start = (pageOffset * 6) % Math.max(list.length, 1);
    return list.slice(start, start + 6);
  }, [category, showAllInCategory, pageOffset]);

  const handleGameClick = (game: GameItem) => {
    if (game.playable) {
      onLaunchAviator(game);
      return;
    }
    // 20 showcase games: clicking feedback only, do not open/turn on
    showToast(`${game.title} (${game.provider}) — Showcase tile only. Tap Aviator to play live!`);
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?ref=${user?.id ?? 'M999VIP'}`);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 1800);
    } catch {
      // ignore
    }
  };

  const pendingCount =
    deposits.filter((d) => d.status === 'pending').length +
    withdrawals.filter((w) => w.status === 'pending').length;

  const currentSlide = PROMO_SLIDES[slideIdx];

  return (
    <div className="min-h-screen bg-[#111216] pb-24 text-white">
      {/* Sticky Top App Header matching screenshot */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#15171C]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-3 sm:px-4">
          {/* Left: Menu + M999 Gold Logo */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-200 hover:bg-white/5"
            >
              <Menu className="h-5 w-5" />
              <span className="absolute top-1.5 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E11D48] px-1 text-[9px] font-bold text-white">
                {pendingCount > 0 ? pendingCount : 5}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab('home')}
              className="flex items-center gap-0.5 font-display text-2xl font-black tracking-tight"
            >
              <span className="relative bg-gradient-to-b from-[#FDE047] via-[#E5B84B] to-[#B45309] bg-clip-text text-transparent">
                M
              </span>
              <span className="text-white">999</span>
            </button>
          </div>

          {/* Right: PKR Balance Pill + Gold Deposit (+5%) Button */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 items-center gap-1.5 rounded-full border border-[#E5B84B]/35 bg-[#1E2028] px-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#065F46] text-[10px] font-black text-white">
                ₨
              </span>
              <button
                type="button"
                onClick={() => (user ? onOpenWallet('withdraw') : onOpenAuth('login'))}
                className="font-mono-num text-xs font-bold text-[#F2C94C] underline decoration-[#F2C94C]/40 underline-offset-2"
              >
                {user ? user.balance.toFixed(2) : '0.00'}
              </button>
              <button
                type="button"
                onClick={handleRefreshBalance}
                aria-label="Refresh balance"
                className="flex h-6 w-6 items-center justify-center rounded-full text-[#F2C94C] hover:bg-white/10"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => onOpenWallet('deposit')}
                className="flex h-9 items-center gap-1 rounded-lg bg-gradient-to-b from-[#FDE047] via-[#E5B84B] to-[#CA8A04] px-3 text-xs font-extrabold text-[#111216] shadow-md transition-transform active:scale-95"
              >
                <span>Deposit</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <span className="pointer-events-none absolute -top-2 -right-1 rounded bg-gradient-to-r from-[#EF4444] to-[#F97316] px-1 text-[9px] font-extrabold text-white shadow">
                +5%
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-3 pt-2.5 sm:px-4">
        {bottomTab === 'home' && (
          <div className="space-y-3">
            {/* Link Wallet Sub-bar matching screenshot */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-[#181A20] px-3 py-2">
              <p className="min-w-0 flex-1 text-[11px] leading-snug text-zinc-200">
                Link <span className="font-bold text-white">Wallet</span> deposit/withdrawal free +
                draw <span className="font-mono-num font-bold text-[#F2C94C]">777,777.70</span> Big
                prize
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                <PWAInstallButton variant="compact" />
                <button
                  type="button"
                  onClick={() => onOpenWallet('deposit')}
                  className="h-7 rounded-md bg-gradient-to-b from-[#F2C94C] to-[#D99B26] px-3 text-[11px] font-bold text-[#111216]"
                >
                  Link
                </button>
                <button
                  type="button"
                  onClick={handleRefreshBalance}
                  aria-label="Sync wallet"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#F2C94C] hover:bg-white/5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Hero Promo Banner Carousel matching Lucky 9 Celebration */}
            <section className="relative overflow-hidden rounded-2xl border border-[#E5B84B]/30 bg-gradient-to-r from-[#1a1408] via-[#452c09] to-[#271906] p-4 shadow-lg sm:p-5">
              <div className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full bg-[#F2C94C]/15 blur-2xl" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-xs font-black text-[#F2C94C]">
                    <span>M999.com</span>
                  </div>
                  <h1 className="font-display mt-0.5 text-lg font-extrabold tracking-tight text-[#FDE047] sm:text-2xl">
                    {currentSlide.title}
                  </h1>
                  <p className="text-[11px] font-semibold text-zinc-200 sm:text-xs">
                    {currentSlide.subtitle}
                  </p>
                  <p className="mt-1 text-[10px] font-bold tracking-wide text-amber-100/90">
                    {currentSlide.highlight}
                  </p>
                  <p className="font-mono-num mt-0.5 text-base font-black text-[#FDE047] sm:text-xl">
                    {currentSlide.amount}
                  </p>
                </div>

                {/* Right Golden Seal Badge */}
                <div className="flex shrink-0 flex-col items-center">
                  <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-[#FDE047] bg-gradient-to-b from-[#dc2626] to-[#7f1d1d] p-2 text-center shadow-[0_0_24px_rgba(250,204,21,0.35)] sm:h-24 sm:w-24">
                    <Sparkles className="h-5 w-5 text-[#FDE047]" />
                    <span className="mt-1 text-[10px] font-black leading-tight text-[#FDE047]">
                      {currentSlide.badge}
                    </span>
                  </div>
                </div>
              </div>

              {/* Carousel Dots */}
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {PROMO_SLIDES.map((s, idx) => (
                  <button
                    key={s.title}
                    type="button"
                    aria-label={`Slide ${idx + 1}`}
                    onClick={() => setSlideIdx(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      slideIdx === idx ? 'w-5 bg-[#F2C94C]' : 'w-1.5 bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </section>

            {/* Marquee Announcement Bar + Mail Badge */}
            <div className="flex items-center gap-2 rounded-xl bg-[#181A20] px-3 py-2">
              <Volume2 className="h-4 w-4 shrink-0 text-zinc-300" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="animate-marquee gap-10 text-xs text-zinc-300">
                  <span>
                    M999 Official Website | M999.com Welcome to M999 · Play Aviator Live · Fast
                    Manual Deposit &amp; Withdrawal
                  </span>
                  <span>
                    M999 Official Website | M999.com Welcome to M999 · Play Aviator Live · Fast
                    Manual Deposit &amp; Withdrawal
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInboxOpen(true)}
                aria-label="Notifications"
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/5"
              >
                <Inbox className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E11D48] px-1 text-[9px] font-bold text-white">
                  {pendingCount > 0 ? pendingCount : 6}
                </span>
              </button>
            </div>

            {/* 5 Quick Promo Icons Strip */}
            <div className="grid grid-cols-5 gap-2 py-1">
              {QUICK_BADGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'invite') {
                      setBottomTab('invite');
                    } else {
                      const avi = GAMES.find((g) => g.playable);
                      if (avi) onLaunchAviator(avi);
                    }
                  }}
                  className="flex flex-col items-center text-center transition-transform active:scale-95"
                >
                  <div
                    className={`relative flex h-12 w-full max-w-[60px] flex-col items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-gradient-to-b ${item.color} shadow-md`}
                  >
                    <span className="text-base leading-none drop-shadow">
                      {item.id === 'invite'
                        ? '💰'
                        : item.id === 'k666'
                        ? '🐓'
                        : item.id === '666h'
                        ? '🚀'
                        : item.id === '999v'
                        ? '💎'
                        : '✈️'}
                    </span>
                    <span className="mt-0.5 rounded bg-black/55 px-1 text-[9px] font-black tracking-tight text-[#FDE047]">
                      {item.code}
                    </span>
                  </div>
                  <span className="mt-1 line-clamp-1 text-[9px] font-bold text-[#F2C94C]">
                    {item.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Category Tabs Strip matching screenshot */}
            <div className="no-scrollbar flex items-center justify-between gap-2 overflow-x-auto border-b border-white/10 pb-2">
              {(
                [
                  { id: 'hot', label: 'Hot', emoji: '🔥' },
                  { id: 'mini', label: 'Mini Games', emoji: '🎲' },
                  { id: 'slot', label: 'Slot', emoji: '🎰' },
                  { id: 'cards', label: 'Cards', emoji: '🃏' },
                  { id: 'fishing', label: 'Fishing', emoji: '🦈' },
                ] as const
              ).map((tab) => {
                const active = category === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setCategory(tab.id);
                      setPageOffset(0);
                    }}
                    className={`flex min-w-[62px] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors ${
                      active ? 'text-[#F2C94C]' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-xl leading-none">{tab.emoji}</span>
                    <span className="whitespace-nowrap text-[11px] font-semibold">
                      {tab.label}
                    </span>
                    <span
                      className={`h-0.5 w-6 rounded-full ${
                        active ? 'bg-[#F2C94C]' : 'bg-transparent'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Section Header + [ ← | All | → ] controls */}
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-[#F97316]" />
                <h2 className="font-display text-base font-bold text-white">
                  {category === 'hot'
                    ? 'Hot'
                    : category === 'mini'
                    ? 'Mini Games'
                    : category === 'slot'
                    ? 'Slot'
                    : category === 'cards'
                    ? 'Cards'
                    : 'Fishing'}
                </h2>
              </div>

              <div className="flex items-center overflow-hidden rounded-lg border border-white/10 bg-[#1B1D24] text-xs">
                <button
                  type="button"
                  aria-label="Previous games"
                  onClick={() => {
                    setShowAllInCategory(false);
                    setPageOffset((p) => Math.max(0, p - 1));
                  }}
                  className="flex h-7 w-7 items-center justify-center text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllInCategory((v) => !v)}
                  className={`h-7 border-x border-white/10 px-3 text-[11px] font-semibold ${
                    showAllInCategory ? 'text-[#F2C94C]' : 'text-zinc-300'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  aria-label="Next games"
                  onClick={() => {
                    setShowAllInCategory(false);
                    setPageOffset((p) => p + 1);
                  }}
                  className="flex h-7 w-7 items-center justify-center text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Game Grid: 3-column mobile layout matching screenshot, expanding on larger screens */}
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {filteredGames.map((game) => (
                <GameCardArt
                  key={game.id}
                  game={game}
                  isFavorite={favorites.includes(game.id)}
                  onSelect={() => handleGameClick(game)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </div>
        )}

        {bottomTab === 'promo' && (
          <div className="space-y-4 pt-2">
            <h2 className="font-display text-xl font-bold text-[#F2C94C]">M999 Promotions</h2>
            <div className="space-y-3">
              {PROMO_SLIDES.map((promo) => (
                <div
                  key={promo.title}
                  className="rounded-2xl border border-[#E5B84B]/25 bg-[#181A20] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F2C94C]">{promo.subtitle}</span>
                    <span className="text-xs font-semibold text-emerald-400">{promo.badge}</span>
                  </div>
                  <h3 className="font-display mt-1 text-lg font-bold text-white">
                    {promo.title}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">{promo.highlight}</p>
                  <button
                    type="button"
                    onClick={() => onOpenWallet('deposit')}
                    className="mt-3 h-10 rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] px-4 text-xs font-bold text-[#111216]"
                  >
                    Deposit &amp; Claim +5%
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {bottomTab === 'invite' && (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-[#E5B84B]/30 bg-gradient-to-b from-[#231d10] to-[#181A20] p-5 text-center">
              <Gift className="mx-auto h-10 w-10 text-[#F2C94C]" />
              <h2 className="font-display mt-2 text-xl font-bold text-white">
                Invite Friends &amp; Earn Rs 2,000
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Share your personal M999 invite link with friends.
              </p>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="mx-auto mt-4 flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] px-5 text-xs font-bold text-[#111216]"
              >
                {copiedInvite ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedInvite ? 'Invite Link Copied!' : 'Copy Invite Link'}
              </button>
            </div>
          </div>
        )}

        {bottomTab === 'support' && (
          <div className="space-y-4 pt-2">
            <h2 className="font-display text-xl font-bold text-white">Support &amp; Help</h2>
            <div className="rounded-2xl border border-white/10 bg-[#181A20] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#F2C94C]">
                <ShieldCheck className="h-5 w-5" />
                <span>Manual Deposit Account Details</span>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-300">
                <p>
                  Method: <strong className="text-white">{paymentSettings.paymentMethod}</strong>
                </p>
                <p>
                  Account Name:{' '}
                  <strong className="text-white">{paymentSettings.accountName}</strong>
                </p>
                <p>
                  Account Number:{' '}
                  <strong className="font-mono-num text-[#F2C94C]">
                    {paymentSettings.accountNumber}
                  </strong>
                </p>
              </div>
              <p className="border-t border-white/10 pt-3 text-xs leading-relaxed text-zinc-400">
                {paymentSettings.instructions}
              </p>
            </div>
          </div>
        )}

        {bottomTab === 'profile' && (
          <div className="space-y-4 pt-2">
            <PWAInstallButton variant="full" />
            {!user ? (
              <div className="rounded-2xl border border-white/10 bg-[#181A20] p-6 text-center">
                <User className="mx-auto h-10 w-10 text-[#F2C94C]" />
                <h2 className="font-display mt-2 text-lg font-bold text-white">
                  Sign In to View Wallet &amp; History
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Create an account or sign in to submit deposit screenshots and track approvals.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="h-11 rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] px-5 text-xs font-bold text-[#111216]"
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="h-11 rounded-xl border border-white/15 bg-[#111216] px-5 text-xs font-bold text-white"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-[#E5B84B]/25 bg-[#181A20] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-lg font-bold text-white">{user.name}</p>
                      <p className="font-mono-num text-xs text-zinc-400">{user.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-[#111216] px-3 text-xs text-zinc-300 hover:text-white"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl bg-[#111216] p-3.5">
                    <div>
                      <p className="text-[11px] text-zinc-400">Wallet Balance</p>
                      <p className="font-mono-num text-2xl font-extrabold text-[#F2C94C]">
                        Rs {user.balance.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenWallet('deposit')}
                        className="flex h-10 items-center gap-1 rounded-xl bg-[#E5B84B] px-3.5 text-xs font-bold text-[#111216]"
                      >
                        <ArrowDownLeft className="h-4 w-4" />
                        Deposit
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenWallet('withdraw')}
                        className="flex h-10 items-center gap-1 rounded-xl border border-white/15 bg-[#1E2028] px-3.5 text-xs font-bold text-white"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        Withdraw
                      </button>
                    </div>
                  </div>
                </div>

                {/* Deposit & Withdrawal Status History */}
                <div className="rounded-2xl border border-white/10 bg-[#181A20] p-4">
                  <h3 className="font-display text-sm font-bold text-white">
                    Deposit Requests
                  </h3>
                  {deposits.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">No deposits submitted yet.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {deposits.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-xl bg-[#111216] px-3 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-mono-num font-bold text-white">
                              + Rs {d.amount.toFixed(2)}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {new Date(d.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`font-semibold capitalize ${
                              d.status === 'approved'
                                ? 'text-emerald-400'
                                : d.status === 'rejected'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <h3 className="font-display mt-5 text-sm font-bold text-white">
                    Withdrawal Requests
                  </h3>
                  {withdrawals.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">No withdrawals requested yet.</p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {withdrawals.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between rounded-xl bg-[#111216] px-3 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-mono-num font-bold text-white">
                              - Rs {w.amount.toFixed(2)} · {w.method}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {w.accountNumber} · {new Date(w.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`font-semibold capitalize ${
                              w.status === 'approved'
                                ? 'text-emerald-400'
                                : w.status === 'rejected'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar matching screenshot */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#15171C]/95 backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-4xl grid-cols-5 items-center">
          {(
            [
              { id: 'home', label: 'Home', icon: Home },
              { id: 'promo', label: 'Promo', icon: Gift, badge: 5 },
              { id: 'invite', label: 'Invite', icon: Users },
              { id: 'support', label: 'Support', icon: Headphones },
              { id: 'profile', label: 'Profile', icon: User },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = bottomTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setBottomTab(item.id)}
                className={`relative flex h-full flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-[#F2C94C]' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {'badge' in item && item.badge && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E11D48] px-1 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Slide-out Side Menu Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm">
          <div className="flex h-full w-72 flex-col border-r border-white/10 bg-[#15171C] p-5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xl font-black text-[#F2C94C]">M999</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  const avi = GAMES.find((g) => g.playable);
                  if (avi) onLaunchAviator(avi);
                }}
                className="flex h-11 w-full items-center justify-between rounded-xl bg-rose-600/20 px-3.5 text-sm font-bold text-rose-300"
              >
                <span>Play Aviator Live</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenWallet('deposit');
                }}
                className="flex h-11 w-full items-center justify-between rounded-xl bg-[#1E2028] px-3.5 text-sm font-semibold text-white"
              >
                <span>Manual Deposit</span>
                <span className="text-xs text-[#F2C94C]">+5%</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenWallet('withdraw');
                }}
                className="flex h-11 w-full items-center justify-between rounded-xl bg-[#1E2028] px-3.5 text-sm font-semibold text-white"
              >
                <span>Withdraw Funds</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setBottomTab('profile');
                }}
                className="flex h-11 w-full items-center justify-between rounded-xl bg-[#1E2028] px-3.5 text-sm font-semibold text-white"
              >
                <span>Transaction History</span>
              </button>
              <div className="pt-2">
                <PWAInstallButton variant="full" />
              </div>
            </div>

            <div className="mt-auto border-t border-white/10 pt-4">
              {user ? (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">
                    Signed in as <strong className="text-white">{user.name}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onLogout();
                    }}
                    className="h-10 w-full rounded-xl border border-white/10 text-xs font-semibold text-zinc-300"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenAuth('register');
                  }}
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] text-xs font-bold text-[#111216]"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* Inbox / Notifications Modal */}
      {inboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#181A20] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">Notifications</h3>
              <button
                type="button"
                onClick={() => setInboxOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="rounded-xl bg-[#111216] p-3">
                <p className="font-semibold text-[#F2C94C]">Lucky 9 Celebration</p>
                <p className="mt-0.5 text-zinc-400">
                  Cash rewards on the 9th, 19th, and 29th of every month.
                </p>
              </div>
              {deposits.slice(0, 3).map((d) => (
                <div key={d.id} className="rounded-xl bg-[#111216] p-3">
                  <p className="font-semibold text-white">
                    Deposit Rs {d.amount.toFixed(2)} —{' '}
                    <span className="capitalize text-[#F2C94C]">{d.status}</span>
                  </p>
                  <p className="mt-0.5 text-zinc-500">
                    {new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Toast for showcase game clicks & status */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
          <div className="rounded-xl border border-[#E5B84B]/40 bg-[#181A20]/95 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-xl backdrop-blur">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
};
