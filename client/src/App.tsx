import { Suspense, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

import { setAccessTokenProvider } from '@/api/client';
import { AppLayout } from '@/components/app-layout/appLayout';
import { ErrorBoundary } from '@/components/error-boundary/errorBoundary';
import { RequireAuth } from '@/components/require-auth/requireAuth';
import { RootRedirect } from '@/components/root-redirect/rootRedirect';
import { AccountPage } from '@/routes/account/accountPage';
import { HistoryPage } from '@/routes/history/historyPage';
import { NotFound } from '@/routes/not-found/notFound';
import { OnboardingPage } from '@/routes/onboarding/onboardingPage';
import { SignInRoute } from '@/routes/sign-in/signInRoute';
import { TrackerPage } from '@/routes/tracker-page/trackerPage';
import { Spinner } from '@/shadcn/ui/spinner';
import { useAppStore } from '@/store/useAppStore';

function useProviderSession(): void {
  const { isLoading, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const resolveSession = useAppStore((state) => state.resolveSession);
  const settled = useRef<string | null>(null);

  useEffect(() => {
    setAccessTokenProvider(async () => {
      try {
        return await getAccessTokenSilently();
      } catch {
        // Every failure here means the same thing — there is no usable
        // credential — and the request that follows will be answered 401, which
        // is already handled in one place. Nothing is gained by distinguishing
        // an expired session from a revoked one.
        return null;
      }
    });
  }, [getAccessTokenSilently]);

  useEffect(() => {
    const flags = `${String(isLoading)}:${String(isAuthenticated)}`;
    if (settled.current === flags) return;
    settled.current = flags;
    void resolveSession({ isLoading, isAuthenticated });
  }, [isLoading, isAuthenticated, resolveSession]);
}

export default function App(): JSX.Element {
  useProviderSession();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        {/* Not a screen: /sign-in renders nothing, it starts
            the redirect to the hosted page. */}
        <Route path="/sign-in" element={<SignInRoute />} />

        <Route element={<RequireAuth />}>
          {/* Outside `AppLayout` on purpose,Onboarding
              is a linear task with a completion state, so it is presented over
              the app rather than inside it 
               */}
          <Route
            path="/onboarding"
            element={
              <ErrorBoundary>
                <Suspense fallback={<Spinner className="mx-auto mt-12 size-6" />}>
                  <OnboardingPage />
                </Suspense>
              </ErrorBoundary>
            }
          />

          <Route element={<AppLayout />}>
            <Route
              path="/track"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<Spinner className="mx-auto mt-12 size-6" />}>
                    <TrackerPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route path="/account" element={<AccountPage />} />
            <Route
              path="/history"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<Spinner className="mx-auto mt-12 size-6" />}>
                    <HistoryPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
