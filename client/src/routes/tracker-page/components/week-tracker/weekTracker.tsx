import type { JSX } from 'react';

import { Program } from '@/routes/tracker-page/components/week-tracker/components/program/program';
import { WeekHeading } from '@/routes/tracker-page/components/week-tracker/components/week-heading/weekHeading';

export function WeekTracker(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <WeekHeading />
      <Program />
    </div>
  );
}
