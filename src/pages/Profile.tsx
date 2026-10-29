import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Card, Badge } from '@/components/ui';
import { UserCircle, ShieldCheck, SignOut } from '@phosphor-icons/react';

export const Profile: React.FC = () => {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Account & Settings</h1>

      <Card padding="lg" className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green text-ink flex items-center justify-center font-bold text-2xl border-2 border-ink">
            {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">
              {profile?.display_name || user?.email?.split('@')[0] || 'SafeSwap User'}
            </h2>
            <p className="text-sm text-ink-muted">{user?.email || 'Guest Session'}</p>
            <div className="mt-1">
              <Badge variant="success" size="sm" dot>
                Verified Escrow Member
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex justify-between py-2 border-b border-border/50 text-sm">
            <span className="text-ink-muted">Account Role</span>
            <span className="font-mono font-medium capitalize">{profile?.role || 'Buyer'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50 text-sm">
            <span className="text-ink-muted">KYC Compliance</span>
            <span className="text-ink font-medium">Escrow Ready (Level 1)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50 text-sm">
            <span className="text-ink-muted">Default Currency</span>
            <span className="font-mono font-medium">PHP (₱)</span>
          </div>
        </div>

        <div className="pt-2">
          {user ? (
            <Button
              variant="danger"
              leftIcon={<SignOut size={18} />}
              onClick={() => signOut()}
              fullWidth
            >
              Sign Out
            </Button>
          ) : (
            <Button variant="primary" fullWidth onClick={() => (window.location.href = '/auth')}>
              Sign In
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Profile;
