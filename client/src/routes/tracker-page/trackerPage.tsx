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

  if (week === null) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">No current week</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Plan generation is temporarily unavailable. Check back once a plan has been assigned.
        </p>
      </div>
    );
  }

  return <WeekTracker />;
}
