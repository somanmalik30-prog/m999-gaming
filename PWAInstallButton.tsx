import React, { useState } from 'react';
import { Check, Copy, Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    setShowGuide(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleClick}
          className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-[#E5B84B]/50 bg-[#E5B84B]/15 px-2.5 text-[11px] font-bold text-[#F2C94C] transition-colors hover:bg-[#E5B84B]/25 active:scale-95"
        >
          <Download className="h-3 w-3" />
          <span>App</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] px-4 text-xs font-extrabold text-[#111216] shadow-md transition-transform active:scale-[0.98]"
        >
          <Download className="h-4 w-4" />
          <span>Install M999 App on Phone</span>
        </button>
      )}

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#E5B84B]/30 bg-[#181A20] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5B84B]/20 text-[#F2C94C]">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-bold text-white">
                  Install M999 App
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-4 space-y-2.5 text-xs text-zinc-300">
                <li className="flex items-start gap-2 rounded-xl bg-[#111216] p-3">
                  <Share className="mt-0.5 h-4 w-4 shrink-0 text-[#F2C94C]" />
                  <span>
                    1. Open this link in <strong>Safari</strong> and tap the{' '}
                    <strong>Share</strong> button at the bottom.
                  </span>
                </li>
                <li className="rounded-xl bg-[#111216] p-3">
                  2. Scroll down and tap <strong>Add to Home Screen</strong> →{' '}
                  <strong>Add</strong>.
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2.5 text-xs text-zinc-300">
                <li className="rounded-xl bg-[#111216] p-3">
                  1. Open the app directly in <strong>Chrome</strong> (outside preview iframe if
                  needed).
                </li>
                <li className="rounded-xl bg-[#111216] p-3">
                  2. Tap the browser menu (<strong>⋮</strong>) and select{' '}
                  <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </li>
              </ol>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F2C94C] to-[#D99B26] text-xs font-bold text-[#111216]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Link Copied!' : 'Copy App Link'}
              </button>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="h-10 rounded-xl border border-white/15 bg-[#111216] px-4 text-xs font-semibold text-zinc-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
