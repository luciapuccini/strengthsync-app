import type { JSX } from 'react';

import { CompleteWeekButton } from '@/routes/tracker-page/components/week-tracker/components/complete-week-button/completeWeekButton';

export function BetweenWeeks(): JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h1 className="text-xl font-semibold">Your training week is over</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Complete it and we&apos;ll build next week from how it went. It takes about a minute.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CompleteWeekButton />
      </div>
    </div>
  );
}
