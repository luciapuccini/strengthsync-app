import type { JSX } from 'react';

import { CompleteWeekButton } from '@/routes/tracker-page/components/week-tracker/components/complete-week-button/completeWeekButton';
import { Button } from '@/shadcn/ui/button';

type BetweenWeeksProps = {
  onCheckAgain: () => void;
};

/**
 * The athlete has a plan but no in-flight week: `getCurrentWeek` stops
 * returning a week once today is past its `end_date`, so this is what the day
 * after a week ends looks like. Without it the tracker reads that absence as
 * "no plan" and offers to build a second one on top of the first.
 *
 * The button is the only way out, not a shortcut — nothing turns a week over on
 * its own yet — so the copy asks for the press rather than promising a wait.
 */
export function BetweenWeeks({ onCheckAgain }: BetweenWeeksProps): JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h1 className="text-xl font-semibold">Your training week is over</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Complete it and we&apos;ll build next week from how it went. It takes about a minute.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CompleteWeekButton />
        <Button variant="outline" size="sm" className="min-h-11 px-3" onClick={onCheckAgain}>
          Check again
        </Button>
      </div>
    </div>
  );
}
