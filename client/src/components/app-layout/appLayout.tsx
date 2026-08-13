import type { JSX } from "react";
import { Link, Outlet } from "react-router-dom";

import { SignOutButton } from "@/components/sign-out-button/signOutButton";
import { Toaster } from "@/shadcn/ui/sonner";

export function AppLayout(): JSX.Element {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <img
              src="/android-chrome-192x192.png"
              alt="StrengthSync logo"
              className="h-8 w-8 rounded-md"
            />
            <span className="text-base">
              StrengthSync
              <span className="ml-1 align-top text-[10px] font-mono text-muted-foreground">
                beta
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            {/* warning: hardcoded demo client/plan until the routes drop both ids */}
            <Link
              to="/clients/00000000-0000-4000-8000-000000000010/plans/00000000-0000-4000-8000-000000000012/history"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              History
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-5 sm:px-4 md:px-6 md:py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
