import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { Toaster } from './shadcn/ui/sonner'

/**
 * Application root. The client list, picker, and profile screens arrive in
 * the following milestone-2 commits; this is the routing + toast shell.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Placeholder />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

function Placeholder() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-2xl font-semibold">StrengthSync</h1>
      <p className="text-muted-foreground">Client profile UI — coming together.</p>
    </main>
  )
}
