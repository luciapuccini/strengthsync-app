import { use, useState } from "react";
import type { JSX } from "react";

import { WeekTracker } from "@/routes/tracker-page/components/week-tracker/weekTracker";
import { currentWeekResource } from "@/api/weekResource";
import type { TrackerData } from "@/api/weekResource";
import { useAppStore } from "@/store/useAppStore";

export function TrackerPage(): JSX.Element {
  // No athlete id: the resource asks the session whose tracker this is. The
  // one still in the URL is ignored until the route drops it.
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
  const week = useAppStore((s) => s.week);

  // What a newly registered athlete lands on, thirty seconds after signing up.
  // The wording it replaced reported that plan generation was temporarily
  // unavailable, which described an outage that was not happening: nothing is
  // wrong, there is simply no plan on the account yet.
  if (week === null) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        {/* TODO: first-plan onboarding, the next phase, replaces this branch
            with the flow that builds the athlete's first plan. Until it exists
            there is nothing to offer here, so this says so rather than
            promising a plan is on its way. */}
        <h1 className="text-xl font-semibold">You&apos;re all set up</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          There&apos;s no training plan on your account yet, so there&apos;s
          nothing to track. That&apos;s expected for a new account.
        </p>
      </div>
    );
  }

  return <WeekTracker />;
}
