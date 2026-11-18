import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="rounded-2xl border border-[#A4AE96]/40 bg-[#F0E9E2] px-4 py-3 text-sm text-[#342B2D] dark:border-[#B3BDAA]/30 dark:bg-[#231C1F] dark:text-[#F6F0EA]">
          FLOURA is installed and running in standalone app mode.
        </div>
      );
    }
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="font-ui inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#705264]/25 bg-[#F0E9E2] px-4 py-2 text-sm font-medium text-[#342B2D] transition hover:bg-[#E7DDD4] whitespace-nowrap shrink-0 dark:border-[#D9A7AF]/30 dark:bg-[#31272C] dark:text-[#F6F0EA] dark:hover:bg-[#3B2F35]"
      >
        <Download className="h-4 w-4 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
        <span>Install FLOURA</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="font-ui inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#342B2D]/15 bg-white px-4 py-2 text-sm font-medium text-[#342B2D] transition hover:bg-[#F0E9E2] whitespace-nowrap shrink-0 dark:border-[#F6F0EA]/15 dark:bg-[#282024] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
        >
          <Smartphone className="h-4 w-4 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#191416]/55 p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-sm rounded-3xl border border-[#342B2D]/12 bg-white p-6 shadow-xl dark:border-[#F6F0EA]/12 dark:bg-[#282024]">
              <div className="flex items-start justify-between gap-4">
                <h3
                  id="ios-install-title"
                  className="font-heading text-xl font-semibold text-[#342B2D] dark:text-[#F6F0EA]"
                >
                  Install on iPhone or iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close installation guide"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#6F5F5D] hover:bg-[#F0E9E2] dark:text-[#C4B5B1] dark:hover:bg-[#31272C]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
                <li>1. Tap the Share icon in your Safari toolbar.</li>
                <li>2. Scroll down and select Add to Home Screen.</li>
                <li>3. Tap Add to launch FLOURA offline anytime.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="font-ui mt-5 min-h-[44px] w-full rounded-xl bg-[#705264] px-4 py-2 text-sm font-medium text-white hover:bg-[#5E4354] dark:bg-[#D9A7AF] dark:text-[#191416]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (variant === 'card') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowManualGuide((v) => !v)}
          className="font-ui inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#342B2D]/15 bg-[#F8F4EC] px-4 py-2 text-sm font-medium text-[#342B2D] transition hover:bg-[#F0E9E2] dark:border-[#F6F0EA]/15 dark:bg-[#191416] dark:text-[#F6F0EA] dark:hover:bg-[#31272C]"
        >
          <Download className="h-4 w-4 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
          <span>How to Install on Device</span>
        </button>
        {showManualGuide && (
          <p className="mt-2.5 text-xs leading-relaxed text-[#6F5F5D] dark:text-[#C4B5B1]">
            In Chrome, Edge, or Android browsers, open the browser menu (or address bar install icon) and choose Install FLOURA to use it offline as a standalone app.
          </p>
        )}
      </>
    );
  }

  return null;
};
