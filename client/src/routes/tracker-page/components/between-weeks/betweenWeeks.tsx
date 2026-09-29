import type { JSX } from 'react';

import { CompleteWeekButton } from '@/routes/tracker-page/components/week-tracker/components/complete-week-button/completeWeekButton';

export function BetweenWeeks(): JSX.Element {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <img
        src="/athlete-no-bg.png"
        alt=""
        aria-hidden="true"
        width={240}
        height={240}
        loading="eager"
        decoding="async"
        className="h-48 w-48 md:h-60 md:w-60"
      />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Your training week is over</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Complete it and we&apos;ll build next week from how it went. It takes about a minute.
      </p>
      <div className="mt-6">
        <CompleteWeekButton size="xl" />
      </div>
    </div>
  );
}
