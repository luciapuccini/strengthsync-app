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
import { ComposingScreenPreview } from '@/routes/onboarding/components/composing-screen/composingScreenPreview';
import { OnboardingPage } from '@/routes/onboarding/onboardingPage';
import { SignInRoute } from '@/routes/sign-in/signInRoute';
import { TrackerPage } from '@/routes/tracker-page/trackerPage';
import { Spinner } from '@/shadcn/ui/spinner';
import { useAppStore } from '@/store/useAppStore';

/**
 * The seam between the SDK and the rest of the app. Everything Auth0-aware in
 * the signed-in half of this codebase is these two effects: one hands the API
 * client a way to get a token, the other keeps the store's session status in
 * step with the provider's.
 *
 * Registration comes first, and not by accident — the effects run in the order
 * they are declared, and `resolveSession` calls `GET /api/me`, which needs the
 * token that the first effect is what supplies.
 *
 * The ref guard replaces the old mount-once guard and does the same job for a
 * value that now changes: StrictMode mounts effects twice in development, and
 * React can re-run an effect whenever the SDK re-renders. Keying on the flags
 * themselves means the athlete is read once per actual transition rather than
 * once per render.
 */
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

        {/* Not a screen: /sign-in renders nothing an athlete reads, it starts
            the redirect to the hosted page. It exists because `RequireAuth` and
            `RootRedirect` send a signed-out visitor to a path, and this is the
            one place that path is turned into an authorize request. There is no
            /sign-up — registration is disabled at the connection. */}
        <Route path="/sign-in" element={<SignInRoute />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
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

        {import.meta.env.DEV && (
          <Route path="/dev/composing" element={<ComposingScreenPreview />} />
        )}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
