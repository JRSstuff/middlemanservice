import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Button, Badge } from '@/components/ui';
import {
  ShieldCheck,
  Bell,
  SignOut,
  WifiSlash,
  ArrowsClockwise,
  User,
} from '@phosphor-icons/react';

export const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { isOnline, pendingQueueCount } = useOnlineStatus();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-none border-b border-border safe-top">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 focus-ring rounded-md p-1">
          <span className="p-1.5 bg-green rounded text-ink flex items-center justify-center">
            <ShieldCheck size={22} weight="duotone" />
          </span>
          <span className="font-bold text-lg tracking-tight text-ink font-sans">
            Safe<span className="text-ink-muted">Swap</span>
          </span>
        </Link>

        {/* Middle Status / Indicator */}
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <Badge variant="danger" size="sm" dot>
              Offline
            </Badge>
          ) : pendingQueueCount > 0 ? (
            <Badge variant="warning" size="sm" dot>
              Syncing ({pendingQueueCount})
            </Badge>
          ) : null}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Quick links */}
          <Link to="/staff" className="focus-ring rounded-md">
            <Button size="sm" variant="secondary" className="text-xs">
              Staff Console
            </Button>
          </Link>

          <Link to="/gallery" className="hidden sm:inline-block">
            <Button size="sm" variant="ghost">
              Gallery
            </Button>
          </Link>

          {user ? (
            <>
              <Link to="/notifications" aria-label="Notifications" className="focus-ring rounded-md">
                <Button size="sm" variant="ghost" className="p-2 h-9 w-9">
                  <Bell size={18} />
                </Button>
              </Link>

              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <Link to="/profile" className="flex items-center gap-1.5 focus-ring rounded-md p-1">
                  <div className="w-7 h-7 rounded-full bg-green text-ink flex items-center justify-center font-bold text-xs">
                    {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-medium text-ink hidden md:inline-block max-w-[100px] truncate">
                    {profile?.display_name || user.email?.split('@')[0]}
                  </span>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => signOut()}
                  className="p-1.5 h-8 w-8 text-ink-muted hover:text-ink"
                  aria-label="Sign out"
                >
                  <SignOut size={16} />
                </Button>
              </div>
            </>
          ) : (
            <Button size="sm" variant="primary" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
