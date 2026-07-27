import { Suspense } from 'react'
import type { JSX } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/app-shell/appShell'
import { ErrorBoundary } from '@/components/error-boundary/errorBoundary'
import { ClientsPage } from '@/routes/clients-page/clientsPage'
import { HomeRedirect } from '@/routes/home-redirect/homeRedirect'
import { NotFound } from '@/routes/not-found/notFound'
import { TrackerPage } from '@/routes/tracker-page/trackerPage'
import { Spinner } from '@/shadcn/ui/spinner'
import { SelectedClientProvider } from '@/contexts/selectedClient'

export default function App(): JSX.Element {
  return (
    <SelectedClientProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route
              path="/"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<Spinner className="mx-auto mt-12 size-6" />}>
                    <HomeRedirect />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route path="/clients" element={<ClientsPage />} />
            <Route
              path="/clients/:clientId/track"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<Spinner className="mx-auto mt-12 size-6" />}>
                    <TrackerPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SelectedClientProvider>
  )
}
