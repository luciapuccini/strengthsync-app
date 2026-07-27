import type { Dispatch, JSX } from "react";

import type { ExerciseLog } from "@strengthsync/domain/model";

import { FeedbackControls } from "./components/feedback-controls/feedbackControls";
import { SetControls } from "./components/set-controls/setControls";
import { cn } from "@/shadcn/lib/utils";
import { isExerciseComplete, remainingSets } from "@/reducers/utils/weekUtils";
import type { WeekAction } from "@/reducers/weekReducer";

type ExerciseRowProps = {
  dayIndex: number;
  dispatch: Dispatch<WeekAction>;
  exercise: ExerciseLog;
  index: number;
};

export function ExerciseRow({
  dayIndex,
  dispatch,
  exercise,
  index,
}: ExerciseRowProps): JSX.Element {
  const remaining = remainingSets(exercise);
  const complete = isExerciseComplete(exercise);
  const weightLabel =
    exercise.prescribed.weight_kg === null
      ? null
      : `${exercise.prescribed.weight_kg} kg`;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-2",
        complete && "text-muted-foreground",
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-1 w-4 shrink-0 text-xs font-bold text-muted-foreground/70">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-base font-semibold md:text-lg",
              complete && "line-through",
            )}
          >
            {exercise.name}
            {exercise.prescribed.notes !== null && (
              <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 align-middle text-[10px] font-bold tracking-wide text-primary uppercase no-underline">
                {exercise.prescribed.notes}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-sm font-medium text-muted-foreground">
            {exercise.prescribed.series}×{exercise.prescribed.reps} ·{" "}
            {exercise.prescribed.rest_time_sec}s
            {weightLabel === null ? "" : ` · ${weightLabel}`} ·{" "}
            {exercise.skipped
              ? "Skipped"
              : remaining === 0
                ? "Complete"
                : `${remaining} remaining`}
          </div>
        </div>
      </div>
      <SetControls
        dayIndex={dayIndex}
        dispatch={dispatch}
        exercise={exercise}
      />
      <FeedbackControls
        dayIndex={dayIndex}
        dispatch={dispatch}
        exercise={exercise}
      />
    </div>
  );
}
