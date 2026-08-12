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
      {/* Blurred glow layer: same image, scaled up and heavily blurred, sitting behind the sharp circle so its edge visually bleeds outward instead of hard-cutting to the page background. */}
      <img
        src="/splash-athlete.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full scale-125 rounded-full object-cover blur-xl opacity-60"
      />
      <img
        src="/splash-athlete.png"
        alt="Athlete performing a barbell squat"
        className="relative z-10 size-full rounded-full object-cover mask-circle mask-radial-closest-side mask-radial-from-50% mask-radial-to-100%"
      />
    </div>
  );
}
