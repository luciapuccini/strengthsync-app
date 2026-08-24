import type { JSX } from 'react';

import { CompleteWeekButton } from '@/routes/tracker-page/components/week-tracker/components/complete-week-button/completeWeekButton';
import { Program } from '@/routes/tracker-page/components/week-tracker/components/program/program';
import { todayIso } from '@/lib/dates';
import { useAppStore } from '@/store/useAppStore';

export function WeekTracker(): JSX.Element {
  const week = useAppStore((s) => s.week)!;
  const isOver = todayIso() >= week.end_date;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {isOver && (
        <div className="flex flex-wrap items-start gap-2">
          <CompleteWeekButton />
        </div>
      )}
      <Program />
    </div>
  );
}
