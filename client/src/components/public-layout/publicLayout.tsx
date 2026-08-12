import type { JSX } from "react";
import { Outlet } from "react-router-dom";

// Mobile shell for the public/auth routes: a centered phone-width column with a
// soft circular radial-yellow glow at the top that fades out toward the edges.
export function PublicLayout(): JSX.Element {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 size-80 -translate-x-1/2 -translate-y-1/3 rounded-full "
      />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-10">
        <Outlet />
      </main>
    </div>
  );
}
