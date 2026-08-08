import type { JSX } from "react";
import { GeneratePlanButton } from "../generate-plan-button/generatePlanButton";
import { CompleteWeekButton } from "../complete-week-button/completeWeekButton";

export function WeekHeading(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-start gap-2">
        <GeneratePlanButton />
        <CompleteWeekButton />
      </div>
    </div>
  );
}
