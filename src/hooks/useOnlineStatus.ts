import { useState, useEffect } from 'react';
import { offlineDb } from '@/lib/offline-queue';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll or check pending mutation count
    const interval = setInterval(async () => {
      try {
        const count = await offlineDb.mutations
          .where('status')
          .anyOf(['queued', 'failed'])
          .count();
        setPendingQueueCount(count);
      } catch {
        // Dexie might be closing or unready
      }
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    wasOffline,
    pendingQueueCount,
    clearWasOffline: () => setWasOffline(false),
  };
}
