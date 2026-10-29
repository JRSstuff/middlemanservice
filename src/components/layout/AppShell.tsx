import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { PwaPrompt } from './PwaPrompt';
import { StatusBanner } from '@/components/ui';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const AppShell: React.FC = () => {
  const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus();

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col font-sans">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <StatusBanner
          variant="offline"
          message="You are offline. Previously loaded deals remain accessible. New notes will queue automatically."
        />
      )}

      {/* Online Reconnection Notification */}
      {isOnline && wasOffline && (
        <StatusBanner
          variant="syncing"
          message="Back online! Synchronizing latest deal states and queued drafts..."
          onDismiss={clearWasOffline}
        />
      )}

      <Header />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-8">
        <Outlet />
      </main>

      <PwaPrompt />
      <BottomNav />
    </div>
  );
};
