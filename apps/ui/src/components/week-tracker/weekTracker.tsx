import type { JSX } from "react";

import { Program } from "@/components/week-tracker/components/program/program";
import { WeekHeading } from "@/components/week-tracker/components/week-heading/weekHeading";
import { useAppStore } from "@/store/useAppStore";

type WeekTrackerProps = {
  clientId: string;
};

export function WeekTracker({ clientId }: WeekTrackerProps): JSX.Element {
  const week = useAppStore((s) => s.week);

  // TrackerPage only renders WeekTracker once the store is hydrated with a
  // non-null week; this guard just keeps the types honest.
  if (week === null) return <></>;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <WeekHeading clientId={clientId} week={week} />
      <Program week={week} />
    </div>
  );
}
