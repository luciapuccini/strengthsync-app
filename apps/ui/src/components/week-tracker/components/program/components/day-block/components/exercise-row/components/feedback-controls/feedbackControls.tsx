import type { Dispatch, JSX } from "react";

import type { ExerciseFeedback, ExerciseLog } from "@strengthsync/domain/model";

import { Button } from "@/shadcn/ui/button";
import type { WeekAction } from "@/reducers/weekReducer";

const FEEDBACK_OPTIONS: ExerciseFeedback[] = ["easy", "hard", "heavy", "light"];

type FeedbackControlsProps = {
  dayIndex: number;
  dispatch: Dispatch<WeekAction>;
  exercise: ExerciseLog;
};

export function FeedbackControls({
  dayIndex,
  dispatch,
  exercise,
}: FeedbackControlsProps): JSX.Element {
  return (
    <div className="ml-6 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs text-muted-foreground">Felt:</span>
      {FEEDBACK_OPTIONS.map((feedback) => (
        <Button
          key={feedback}
          type="button"
          size="sm"
          variant={exercise.feedback === feedback ? "secondary" : "ghost"}
          className="min-h-9 px-2 capitalize"
          onClick={() =>
            dispatch({
              type: "SET_FEEDBACK",
              dayIndex,
              exerciseKey: exercise.exercise_key,
              feedback: exercise.feedback === feedback ? null : feedback,
            })
          }
        >
          {feedback}
        </Button>
      ))}
    </div>
  );
}
