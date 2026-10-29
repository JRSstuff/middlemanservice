import React, { useState, useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import { DownloadSimple, ArrowClockwise, X } from '@phosphor-icons/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setNeedRefresh(true);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (needRefresh) {
    return (
      <div className="fixed bottom-16 md:bottom-6 right-4 z-40 max-w-sm">
        <Card padding="sm" className="bg-white border-2 border-green shadow-lg flex items-center justify-between gap-3">
          <div className="text-xs">
            <p className="font-semibold text-ink">Update Available</p>
            <p className="text-ink-muted">A new version of SafeSwap is ready.</p>
          </div>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<ArrowClockwise size={14} />}
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </Card>
      </div>
    );
  }

  if (!showInstallBanner || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-16 md:bottom-6 left-4 right-4 md:left-auto md:right-4 z-40 max-w-sm">
      <Card padding="sm" className="bg-white border border-border shadow-lg flex items-center justify-between gap-3">
        <div className="text-xs">
          <p className="font-semibold text-ink">Install SafeSwap App</p>
          <p className="text-ink-muted">Install for offline read access and instant escrow notifications.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<DownloadSimple size={14} />}
            onClick={handleInstallClick}
          >
            Install
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="p-1 h-8 w-8"
            aria-label="Dismiss install banner"
            onClick={() => setShowInstallBanner(false)}
          >
            <X size={14} />
          </Button>
        </div>
      </Card>
    </div>
  );
};
