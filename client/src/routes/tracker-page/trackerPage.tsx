import { use, useState } from 'react';
import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import { BetweenWeeks } from '@/routes/tracker-page/components/between-weeks/betweenWeeks';
import { WeekTracker } from '@/routes/tracker-page/components/week-tracker/weekTracker';
import { currentWeekResource } from '@/api/weekResource';
import type { TrackerData } from '@/api/weekResource';
import { Button } from '@/shadcn/ui/button';
import { useAppStore } from '@/store/useAppStore';

export function TrackerPage(): JSX.Element {
  const data = use(currentWeekResource());

  const [hydratedFrom, setHydratedFrom] = useState<TrackerData | null>(null);
  if (hydratedFrom !== data) {
    setHydratedFrom(data);
    useAppStore.getState().hydrateTracker(data);
  }
  const plan = useAppStore((s) => s.plan);
  const week = useAppStore((s) => s.week);

  if (plan === null && week === null) {
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
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">You&apos;re all set up</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          There&apos;s no training plan on your account yet. Answer a few questions and we&apos;ll
          build your first one.
        </p>
        <Button asChild size="xl" className="mt-6">
          <Link to="/onboarding">Build your plan</Link>
        </Button>
      </div>
    );
  }

  if (week === null) {
    return <BetweenWeeks />;
  }

  return <WeekTracker />;
}
