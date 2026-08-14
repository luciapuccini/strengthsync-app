import { Suspense, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/app-layout/appLayout';
import { ErrorBoundary } from '@/components/error-boundary/errorBoundary';
import { PublicLayout } from '@/components/public-layout/publicLayout';
import { RequireAuth } from '@/components/require-auth/requireAuth';
import { RootRedirect } from '@/components/root-redirect/rootRedirect';
import { HistoryPage } from '@/routes/history/historyPage';
import { NotFound } from '@/routes/not-found/notFound';
import { OnboardingPage } from '@/routes/onboarding/onboardingPage';
import { SignIn } from '@/routes/sign-in/signIn';
import { SignUp } from '@/routes/sign-up/signUp';
import { TrackerPage } from '@/routes/tracker-page/trackerPage';
import { Spinner } from '@/shadcn/ui/spinner';
import { useAppStore } from '@/store/useAppStore';

/**
 * Ask the server who is signed in, exactly once per app mount. The ref guard is
 * what makes that "once" true under StrictMode, which mounts effects twice in
 * development — without it a cold load would fire two bootstrap requests.
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

        <Route element={<PublicLayout />}>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
        </Route>

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

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
