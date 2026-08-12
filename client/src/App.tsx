import { Suspense } from "react";
import type { JSX } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/app-layout/appLayout";
import { ErrorBoundary } from "@/components/error-boundary/errorBoundary";
import { PublicLayout } from "@/components/public-layout/publicLayout";
import { RequireAuth } from "@/components/require-auth/requireAuth";
import { RootRedirect } from "@/components/root-redirect/rootRedirect";
import { ClientsPage } from "@/routes/clients-page/clientsPage";
import { HistoryPage } from "@/routes/history/historyPage";
import { NotFound } from "@/routes/not-found/notFound";
import { SignIn } from "@/routes/sign-in/signIn";
import { SignUp } from "@/routes/sign-up/signUp";
import { TrackerPage } from "@/routes/tracker-page/trackerPage";
import { Spinner } from "@/shadcn/ui/spinner";

export default function App(): JSX.Element {
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
            <Route path="/clients" element={<ClientsPage />} />
            <Route
              path="/clients/:clientId/track"
              element={
                <ErrorBoundary>
                  <Suspense
                    fallback={<Spinner className="mx-auto mt-12 size-6" />}
                  >
                    <TrackerPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/clients/:clientId/plans/:planId/history"
              element={
                <ErrorBoundary>
                  <Suspense
                    fallback={<Spinner className="mx-auto mt-12 size-6" />}
                  >
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
