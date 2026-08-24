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

  // Hydrate the store synchronously during render (React's "adjust state
  // during render" pattern), guarded by reference equality against the
  // resolved resource. This keeps the store as the single source of truth
  // for `week` while avoiding an effect-driven flash or a stale-store frame.
  const [hydratedFrom, setHydratedFrom] = useState<TrackerData | null>(null);
  if (hydratedFrom !== data) {
    setHydratedFrom(data);
    useAppStore.getState().hydrateTracker(data);
  }
  const plan = useAppStore((s) => s.plan);
  const week = useAppStore((s) => s.week);

  if (plan === null && week === null) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">You&apos;re all set up</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          There&apos;s no training plan on your account yet. Answer a few questions and we&apos;ll
          build your first one.
        </p>
        <Button asChild size="xl" className="mt-4">
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
