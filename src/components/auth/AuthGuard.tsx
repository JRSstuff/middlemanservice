import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SignInForm } from '@/components/auth/SignInForm';
import { Skeleton } from '@/components/ui';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton.Card />
        </div>
      </div>
    );
  }

  if (!user) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <SignInForm />
      </div>
    );
  }

  return <>{children}</>;
};
