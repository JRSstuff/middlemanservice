import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { queryClient } from '@/lib/query-client';
import { AppShell } from '@/components/layout/AppShell';
import { SafeSwapToaster, ErrorState, Skeleton } from '@/components/ui';

// Route-level code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const NewDeal = lazy(() => import('@/pages/NewDeal'));
const DealDetail = lazy(() => import('@/pages/DealDetail'));
const Payment = lazy(() => import('@/pages/Payment'));
const Dispute = lazy(() => import('@/pages/Dispute'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Profile = lazy(() => import('@/pages/Profile'));
const SignIn = lazy(() => import('@/pages/SignIn'));
const StaffConsole = lazy(() => import('@/pages/StaffConsole'));
const ComponentGallery = lazy(() => import('@/pages/ComponentGallery'));
const NotFound = lazy(() => import('@/pages/NotFound'));

import { logErrorToSentry } from '@/config/sentry';

function PageLoader() {
  return (
    <div className="py-12 space-y-4 max-w-2xl mx-auto">
      <Skeleton height="36px" width="50%" />
      <Skeleton.Card />
    </div>
  );
}

function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  React.useEffect(() => {
    console.error('SafeSwap Uncaught App Error:', error);
  }, [error]);

  const errorMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Something went wrong';
  const errorStack = error instanceof Error ? error.stack : undefined;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <ErrorState
          title="Application Encountered an Error"
          description={errorMessage || 'Please try refreshing or returning home.'}
          onRetry={resetErrorBoundary}
          onGoHome={() => (window.location.href = '/')}
        />
        {import.meta.env.DEV && errorStack && (
          <details className="p-3 bg-red-50 border border-red-200 text-red-950 text-xs rounded font-mono overflow-auto max-h-60">
            <summary className="cursor-pointer font-bold mb-2">Error Details (Development Only)</summary>
            <pre className="whitespace-pre-wrap">{errorStack}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary FallbackComponent={GlobalErrorFallback} onError={logErrorToSentry}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* App Shell routes */}
              <Route path="/" element={<AppShell />}>
                <Route index element={<Dashboard />} />
                <Route path="deals/new" element={<NewDeal />} />
                <Route path="deals/:id" element={<DealDetail />} />
                <Route path="deals/:id/pay" element={<Payment />} />
                <Route path="deals/:id/dispute" element={<Dispute />} />
                <Route path="disputes" element={<Dispute />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="profile" element={<Profile />} />
                <Route path="auth" element={<SignIn />} />
                <Route path="staff" element={<StaffConsole />} />
                <Route path="gallery" element={<ComponentGallery />} />
                <Route path="404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Route>
            </Routes>
          </Suspense>
          <SafeSwapToaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
