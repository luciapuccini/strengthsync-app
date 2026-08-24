import type { JSX } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { SignOutButton } from '@/components/sign-out-button/signOutButton';
import { Toaster } from '@/shadcn/ui/sonner';

export function AppLayout(): JSX.Element {
  return (
    // `*-safe` utilities (index.css) reserve iOS standalone-mode safe-area
    // insets and collapse to the plain spacing value in a browser tab, where
    // env(safe-area-inset-*) is 0.
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border pt-safe">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 py-3 pr-safe-4 pl-safe-4 md:pr-safe-6 md:pl-safe-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <img
              src="/android-chrome-192x192.png"
              alt="StrengthSync logo"
              className="h-8 w-8 rounded-md"
            />
            <span className="text-base">
              StrengthSync
              <span className="ml-1 align-top font-mono text-[10px] text-muted-foreground">
                beta
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/history" className="text-sm text-muted-foreground hover:text-foreground">
              History
            </Link>
            <Link to="/account" className="text-sm text-muted-foreground hover:text-foreground">
              Account
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 pt-5 pr-safe-3 pb-safe-5 pl-safe-3 sm:pr-safe-4 sm:pl-safe-4 md:pt-6 md:pr-safe-6 md:pb-safe-6 md:pl-safe-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
