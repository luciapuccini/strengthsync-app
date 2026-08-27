import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

import { OnboardingProgress } from '../onboarding-progress/onboardingProgress';

type Props = {
  current: number;
  total: number;
  children: ReactNode;
};

export function OnboardingLayout({ current, total, children }: Props): JSX.Element {
  return (
    <div className="flex min-h-svh flex-col pt-safe pr-safe-3 pb-safe-6 pl-safe-3 sm:pr-safe-4 sm:pl-safe-4">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-5">
        <div className="flex items-center gap-3">
          <Link
            to="/track"
            aria-label="Back to tracker"
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
