import { Suspense } from "react";
import type { JSX } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Layout } from "@/components/layout/layout";
import { ErrorBoundary } from "@/components/error-boundary/errorBoundary";
import { ClientsPage } from "@/routes/clients-page/clientsPage";
import { HistoryPage } from "@/routes/history/historyPage";
import { Home } from "@/routes/home/home";
import { NotFound } from "@/routes/not-found/notFound";
import { TrackerPage } from "@/routes/tracker-page/trackerPage";
import { Spinner } from "@/shadcn/ui/spinner";

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <Suspense
                  fallback={<Spinner className="mx-auto mt-12 size-6" />}
                >
                  <Home />
                </Suspense>
              </ErrorBoundary>
            }
          />
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
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
