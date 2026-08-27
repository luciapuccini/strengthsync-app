import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

import { OnboardingProgress } from '../onboarding-progress/onboardingProgress';

type Props = {
  current: number;
  total: number;
  children: ReactNode;
};

/**
 * The shell the questionnaire is presented in, standing in for the app layout
 * this route deliberately sits outside of (see the `/onboarding` route in
 * `App.tsx` for why). It carries only what a flow needs: the safe-area insets
 * the app layout would otherwise have reserved, how far along the athlete is,
 * and one way out.
 *
 * That way out is a chevron rather than the browser's back button, which does
 * not exist inside the Capacitor shell — and the first step has no Back button
 * of its own, so without this the flow has no exit at all. It leaves without
 * confirming: answers live in the wizard's reducer and are lost either way,
 * which is the behaviour today.
 *
 * `*-safe` utilities (index.css) reserve iOS standalone-mode safe-area insets
 * and collapse to the plain spacing value in a browser tab, where
 * env(safe-area-inset-*) is 0.
 */
export function OnboardingLayout({ current, total, children }: Props): JSX.Element {
  return (
    <div className="flex min-h-svh flex-col pt-safe pr-safe-3 pb-safe-6 pl-safe-3 sm:pr-safe-4 sm:pl-safe-4">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-5">
        <div className="flex items-center gap-3">
          <Link
            to="/track"
            aria-label="Back to tracker"
            // The link is the 44pt tap target (size-11); the chevron inside it
            // is smaller, so the target is not paid for in visual weight. The
            // negative margin keeps the glyph aligned with the content column.
            className="-ml-3 flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <div className="flex-1">
            <OnboardingProgress current={current} total={total} />
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
