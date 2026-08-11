import type { JSX } from "react";

import type { ExerciseFeedback, ExerciseLog } from "@/api/types";

import { Button } from "@/shadcn/ui/button";
import { useAppStore } from "@/store/useAppStore";

const FEEDBACK_OPTIONS: ExerciseFeedback[] = ["easy", "hard", "heavy", "light"];

type FeedbackControlsProps = {
  dayIndex: number;
  exercise: ExerciseLog;
};

export function FeedbackControls({
  dayIndex,
  exercise,
}: FeedbackControlsProps): JSX.Element {
  const setFeedback = useAppStore((s) => s.setFeedback);
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
            setFeedback(
              dayIndex,
              exercise.exercise_key,
              exercise.feedback === feedback ? null : feedback,
            )
          }
        >
          {feedback}
        </Button>
      ))}
    </div>
  );
}
