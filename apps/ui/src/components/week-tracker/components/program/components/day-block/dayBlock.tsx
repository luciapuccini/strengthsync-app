import { useState } from "react";
import type { JSX } from "react";
import { toast } from "sonner";

import type { WeekDay } from "@strengthsync/domain/model";

import { useAppStore } from "@/store/useAppStore";

import { DayHeader } from "./components/day-header/dayHeader";
import { ExerciseRow } from "./components/exercise-row/exerciseRow";

type DayBlockProps = {
  day: WeekDay;
  isFirst: boolean;
};

export function DayBlock({ day, isFirst }: DayBlockProps): JSX.Element {
  const saveDay = useAppStore((s) => s.saveDay);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(!day.completed);

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    const dayToSave: WeekDay =
      day.exercises.length === 0 && !day.completed
        ? { ...day, completed: true }
        : day;
    try {
      // saveDay re-hydrates the whole week from the server response, which
      // already reflects `completed` for dayToSave — no extra client-side
      // "mark complete" step needed here.
      await saveDay(dayToSave);
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
        onSave={handleSave}
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
            {day.exercises.map((exercise) => (
              <ExerciseRow
                key={exercise.exercise_key}
                day={day}
                exercise={exercise}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
