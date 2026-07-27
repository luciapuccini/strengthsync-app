import { useState } from "react";
import type { Dispatch, JSX } from "react";
import { toast } from "sonner";

import type { WeekDay } from "@strengthsync/domain/model";

import type { WeekAction } from "@/reducers/weekReducer";

import { DayHeader } from "./components/day-header/dayHeader";
import { ExerciseRow } from "./components/exercise-row/exerciseRow";

type DayBlockProps = {
  day: WeekDay;
  dispatch: Dispatch<WeekAction>;
  isFirst: boolean;
  onSave: (day: WeekDay) => Promise<void>;
};

export function DayBlock({
  day,
  dispatch,
  isFirst,
  onSave,
}: DayBlockProps): JSX.Element {
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(!day.completed);

  async function saveDay(): Promise<void> {
    setIsSaving(true);
    const dayToSave =
      day.exercises.length === 0 && !day.completed
        ? { ...day, completed: true }
        : day;
    try {
      await onSave(dayToSave);
      if (dayToSave !== day)
        dispatch({ type: "MARK_DAY_COMPLETE", dayIndex: day.day_index });
      toast.success(`Day ${day.day_index} saved`);
    } catch (error) {
      toast.error(`Could not save day ${day.day_index}`, {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={isFirst ? "py-4" : "border-t border-border/50 py-4"}>
      <DayHeader
        day={day}
        isOpen={isOpen}
        isSaving={isSaving}
        onSave={saveDay}
        onToggle={() => setIsOpen((open) => !open)}
      />
      {isOpen && (
        <>
          {day.notes !== null && (
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              {day.notes}
            </p>
          )}
          <div className="flex flex-col gap-3">
            {day.exercises.map((exercise, index) => (
              <ExerciseRow
                key={exercise.exercise_key}
                dayIndex={day.day_index}
                dispatch={dispatch}
                exercise={exercise}
                index={index}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
