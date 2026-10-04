import type { JSX } from 'react';

import { useAppStore } from '@/store/useAppStore';
import { formatIsoDate } from '@/utils/formatIsoDate';
import { CompleteWeekButton } from '@/routes/tracker-page/components/week-tracker/components/complete-week-button/completeWeekButton';

export function BetweenWeeks(): JSX.Element {
  const nextWeekStart = useAppStore((s) => s.nextWeekStart);
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
      {nextWeekStart === null ? (
        <>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Your training week is over</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Complete it and we&apos;ll build next week from how it went. It takes about a minute.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Week complete</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Your next week starts on {formatIsoDate(nextWeekStart)}. Check back then.
          </p>
        </>
      )}
      <div className="mt-6">
        <CompleteWeekButton size="xl" disabled={nextWeekStart !== null} />
      </div>
    </div>
  );
}
