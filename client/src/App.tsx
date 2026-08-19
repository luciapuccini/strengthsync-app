import { Suspense, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/app-layout/appLayout';
import { ErrorBoundary } from '@/components/error-boundary/errorBoundary';
import { RequireAuth } from '@/components/require-auth/requireAuth';
import { RootRedirect } from '@/components/root-redirect/rootRedirect';
import { HistoryPage } from '@/routes/history/historyPage';
import { NotFound } from '@/routes/not-found/notFound';
import { ComposingScreenPreview } from '@/routes/onboarding/components/composing-screen/composingScreenPreview';
import { OnboardingPage } from '@/routes/onboarding/onboardingPage';
import { TrackerPage } from '@/routes/tracker-page/trackerPage';
import { Spinner } from '@/shadcn/ui/spinner';
import { useAppStore } from '@/store/useAppStore';

/**
 * Settle who is signed in, exactly once per app mount. The ref guard is what
 * makes that "once" true under StrictMode, which mounts effects twice in
 * development — without it a cold load would fire two bootstraps. It answers
 * signed-out unconditionally until `issues/013-web-app-universal-login.md`
 * sources it from the Auth0 SDK, and this effect does not change when it does.
 */
function useSessionBootstrap(): void {
  const bootstrapSession = useAppStore((state) => state.bootstrapSession);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void bootstrapSession();
  }, [bootstrapSession]);
}

export default function App(): JSX.Element {
  useSessionBootstrap();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        {/* No /sign-in or /sign-up: authorization happens on Auth0's hosted
            page, not on a route of ours. `RequireAuth` redirects there once
            issue 013 wires the SDK in. */}
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
