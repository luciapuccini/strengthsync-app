import type { JSX } from "react";

import { cn } from "@/shadcn/lib/utils";

// Compact onboarding hero shared by the auth screens: the athlete splash
// circular-masked with a soft radial halo behind it. Kept small so the form
// below it stays above the fold on a typical phone.
export function AuthHero({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn("relative mx-auto aspect-square w-40 sm:w-48", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/25 blur-2xl"
      />
      <img
        src="/splash-athlete.png"
        alt="Athlete performing a barbell squat"
        className="size-full rounded-full object-cover [mask-image:radial-gradient(circle,black_55%,transparent_78%)]"
      />
    </div>
  );
}
