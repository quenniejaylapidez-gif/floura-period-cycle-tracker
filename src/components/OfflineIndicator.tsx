import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineAndUpdateBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW() {
      // Service worker active for offline local-first support
    },
  });

  if (isOnline && !needRefresh) {
    return null;
  }

  return (
    <div
      className="fixed right-4 bottom-22 z-40 flex flex-col gap-2 lg:bottom-6"
      role="status"
      aria-live="polite"
    >
      {!isOnline && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#342B2D]/14 bg-white/95 px-4 py-2.5 text-xs font-medium text-[#342B2D] shadow-lg backdrop-blur-md dark:border-[#F6F0EA]/15 dark:bg-[#282024]/95 dark:text-[#F6F0EA]">
          <WifiOff className="h-4 w-4 text-[#705264] dark:text-[#D9A7AF]" aria-hidden="true" />
          <span>Offline mode — your journal remains saved locally</span>
        </div>
      )}

      {needRefresh && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#705264]/25 bg-white/95 px-4 py-2.5 text-xs font-medium text-[#342B2D] shadow-lg backdrop-blur-md dark:border-[#D9A7AF]/30 dark:bg-[#282024]/95 dark:text-[#F6F0EA]">
          <span>A new version of FLOURA is ready</span>
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="font-ui inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#705264] px-3 py-1 text-xs font-medium text-white hover:bg-[#5E4354] dark:bg-[#D9A7AF] dark:text-[#191416]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Update</span>
          </button>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="font-ui px-2 py-1 text-xs text-[#6F5F5D] hover:text-[#342B2D] dark:text-[#C4B5B1] dark:hover:text-white"
          >
            Later
          </button>
        </div>
      )}
    </div>
  );
};
