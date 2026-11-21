import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { GameItem } from '../types';

interface GameCardArtProps {
  game: GameItem;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}

const POSTER_MAP: Record<
  string,
  {
    src: string;
    imgClass: string;
    overlayClass: string;
    logoLabel?: string;
    logoBg?: string;
    aviatorScript?: boolean;
  }
> = {
  'aviator-wg': {
    src: '/src/assets/images/aviator_plane_poster_1795218334857.jpg',
    imgClass: 'object-cover object-center hue-rotate-[265deg] saturate-125',
    overlayClass: 'bg-gradient-to-b from-indigo-950/30 via-transparent to-purple-950/80',
    logoLabel: 'WG',
    logoBg: 'text-[#4ade80]',
  },
  'aviator-crimson': {
    src: '/src/assets/images/aviator_plane_poster_1795218334857.jpg',
    imgClass: 'object-cover object-center scale-105',
    overlayClass: 'bg-gradient-to-b from-black/25 via-transparent to-red-950/80',
    logoLabel: 'JILI',
    logoBg: 'text-[#fde047]',
    aviatorScript: true,
  },
  'aviator-spribe': {
    src: '/src/assets/images/aviator_plane_poster_1795218334857.jpg',
    imgClass: 'object-cover object-top brightness-95 contrast-115',
    overlayClass: 'bg-gradient-to-b from-zinc-950/35 via-transparent to-black/85',
    logoLabel: 'SPRIBE',
    logoBg: 'text-white',
    aviatorScript: true,
  },
  'wg-slots': {
    src: '/src/assets/images/slots_golden_piggy_1795218334866.jpg',
    imgClass: 'object-cover object-center',
    overlayClass: 'bg-gradient-to-t from-black/80 via-transparent to-transparent',
    logoLabel: 'WG',
    logoBg: 'text-[#4ade80]',
  },
  'jili-slots': {
    src: '/src/assets/images/slots_aztec_king_1795218335448.jpg',
    imgClass: 'object-cover object-top',
    overlayClass: 'bg-gradient-to-t from-black/80 via-transparent to-transparent',
    logoLabel: 'JILI',
    logoBg: 'text-[#facc15]',
  },
  'pg-slots': {
    src: '/src/assets/images/slots_pirate_bounty_1795218335812.jpg',
    imgClass: 'object-cover object-top',
    overlayClass: 'bg-gradient-to-t from-black/80 via-transparent to-transparent',
    logoLabel: 'PG',
    logoBg: 'text-white',
  },
  'fishing-ocean': {
    src: '/src/assets/images/fishing_ocean_king_1795218334712.jpg',
    imgClass: 'object-cover object-center',
    overlayClass: 'bg-gradient-to-t from-black/80 via-transparent to-transparent',
  },
  'fishing-mega': {
    src: '/src/assets/images/fishing_ocean_king_1795218334712.jpg',
    imgClass: 'object-cover object-bottom scale-110 hue-rotate-15',
    overlayClass: 'bg-gradient-to-t from-teal-950/85 via-transparent to-transparent',
  },
  'fishing-bomb': {
    src: '/src/assets/images/fishing_ocean_king_1795218334712.jpg',
    imgClass: 'object-cover object-top scale-110 -hue-rotate-15 saturate-125',
    overlayClass: 'bg-gradient-to-t from-blue-950/85 via-transparent to-transparent',
  },
  'fishing-jackpot': {
    src: '/src/assets/images/slots_pirate_bounty_1795218335812.jpg',
    imgClass: 'object-cover object-bottom scale-110 hue-rotate-[175deg]',
    overlayClass: 'bg-gradient-to-t from-sky-950/85 via-sky-900/15 to-transparent',
  },
  'fishing-dragon': {
    src: '/src/assets/images/fishing_ocean_king_1795218334712.jpg',
    imgClass: 'object-cover object-right scale-115 hue-rotate-[305deg] saturate-125',
    overlayClass: 'bg-gradient-to-t from-red-950/80 via-transparent to-transparent',
  },
  'fishing-happy': {
    src: '/src/assets/images/fishing_ocean_king_1795218334712.jpg',
    imgClass: 'object-cover object-left scale-110 brightness-110',
    overlayClass: 'bg-gradient-to-t from-cyan-950/80 via-transparent to-transparent',
  },
  'slot-gems': {
    src: '/src/assets/images/mini_gems_arcade_1795218335284.jpg',
    imgClass: 'object-cover object-center hue-rotate-30 saturate-125',
    overlayClass: 'bg-gradient-to-t from-purple-950/85 via-transparent to-transparent',
  },
  'slot-money': {
    src: '/src/assets/images/slots_golden_piggy_1795218334866.jpg',
    imgClass: 'object-cover object-bottom scale-115 hue-rotate-[70deg]',
    overlayClass: 'bg-gradient-to-t from-emerald-950/85 via-transparent to-transparent',
  },
  'slot-ace': {
    src: '/src/assets/images/cards_royal_casino_1795218335801.jpg',
    imgClass: 'object-cover object-top scale-105 saturate-125',
    overlayClass: 'bg-gradient-to-t from-red-950/85 via-transparent to-transparent',
  },
  'slot-olympus': {
    src: '/src/assets/images/slots_aztec_king_1795218335448.jpg',
    imgClass: 'object-cover object-center scale-110 hue-rotate-[210deg]',
    overlayClass: 'bg-gradient-to-t from-indigo-950/85 via-transparent to-transparent',
  },
  'slot-bonanza': {
    src: '/src/assets/images/slots_golden_piggy_1795218334866.jpg',
    imgClass: 'object-cover object-center scale-110 hue-rotate-[315deg] saturate-125',
    overlayClass: 'bg-gradient-to-t from-pink-950/85 via-transparent to-transparent',
  },
  'slot-777': {
    src: '/src/assets/images/slots_golden_piggy_1795218334866.jpg',
    imgClass: 'object-cover object-top scale-115 contrast-110',
    overlayClass: 'bg-gradient-to-t from-amber-950/85 via-transparent to-transparent',
  },
  'cards-patti': {
    src: '/src/assets/images/cards_royal_casino_1795218335801.jpg',
    imgClass: 'object-cover object-center',
    overlayClass: 'bg-gradient-to-t from-emerald-950/85 via-transparent to-transparent',
  },
  'cards-andar': {
    src: '/src/assets/images/cards_royal_casino_1795218335801.jpg',
    imgClass: 'object-cover object-bottom scale-110 hue-rotate-[320deg]',
    overlayClass: 'bg-gradient-to-t from-rose-950/85 via-transparent to-transparent',
  },
  'cards-dragon': {
    src: '/src/assets/images/slots_aztec_king_1795218335448.jpg',
    imgClass: 'object-cover object-center scale-115 hue-rotate-[330deg]',
    overlayClass: 'bg-gradient-to-t from-red-950/85 via-transparent to-transparent',
  },
  'mini-mines': {
    src: '/src/assets/images/mini_gems_arcade_1795218335284.jpg',
    imgClass: 'object-cover object-center',
    overlayClass: 'bg-gradient-to-t from-slate-950/85 via-transparent to-transparent',
  },
  'mini-plinko': {
    src: '/src/assets/images/mini_gems_arcade_1795218335284.jpg',
    imgClass: 'object-cover object-bottom scale-110 hue-rotate-60',
    overlayClass: 'bg-gradient-to-t from-violet-950/85 via-transparent to-transparent',
  },
};

export const GameCardArt: React.FC<GameCardArtProps> = ({
  game,
  isFavorite,
  onSelect,
  onToggleFavorite,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const poster = POSTER_MAP[game.artVariant] ?? POSTER_MAP['wg-slots'];

  return (
    <div className="group relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/15 bg-[#1B1D24] shadow-md">
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open ${game.title}`}
        className="absolute inset-0 block h-full w-full p-0 text-left transition-transform duration-150 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2C94C]"
      >
        <div className="absolute inset-0 h-full w-full overflow-hidden bg-gradient-to-b from-[#1f2433] to-[#0f1117]">
          {!imgFailed ? (
            <img
              src={poster.src}
              alt={`${game.title} ${game.provider}`}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className={`h-full w-full ${poster.imgClass}`}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#2b1f63] to-[#111216] p-2 text-center">
              <span className="font-display text-sm font-black text-[#F2C94C]">
                {game.provider}
              </span>
              <span className="mt-1 text-xs font-semibold text-white">{game.title}</span>
            </div>
          )}

          {/* Subtle gradient scrim */}
          <div className={`pointer-events-none absolute inset-0 ${poster.overlayClass}`} />

          {/* Top provider badge (matches WG / SPRIBE / JILI look in screenshot) */}
          <span
            className={`absolute top-1.5 left-1/2 -translate-x-1/2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-black tracking-wider shadow backdrop-blur-xs ${
              poster.logoBg ?? 'text-[#F2C94C]'
            }`}
          >
            {poster.logoLabel ?? game.provider}
          </span>

          {/* Bold Aviator script badge for Aviator cards */}
          {poster.aviatorScript && (
            <div className="pointer-events-none absolute inset-x-0 bottom-7 text-center font-display text-lg font-black italic tracking-tight text-[#ff3b5c] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              Aviator
            </div>
          )}
        </div>

        {/* Top-left HOT badge matching screenshot */}
        {game.badgeText && (
          <span className="absolute top-1.5 left-1.5 z-10 rounded bg-gradient-to-r from-[#dc2626] to-[#f97316] px-1.5 py-0.5 text-[9px] font-black italic tracking-wide text-white shadow">
            {game.badgeText}
          </span>
        )}

        {/* Bottom dark scrim and game title */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-2 pt-5 pb-2 text-center">
          <p className="truncate text-[12px] font-semibold tracking-tight text-white">
            {game.title}
          </p>
        </div>
      </button>

      {/* Top-right favorite star (sibling button, not nested) */}
      <button
        type="button"
        onClick={(e) => onToggleFavorite(e, game.id)}
        aria-label={`Favorite ${game.title}`}
        className="absolute top-1.5 right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white/80 transition-colors hover:bg-black/80 hover:text-[#F2C94C]"
      >
        <Star
          className="h-3.5 w-3.5"
          fill={isFavorite ? '#F2C94C' : 'none'}
          stroke={isFavorite ? '#F2C94C' : 'currentColor'}
        />
      </button>
    </div>
  );
};
