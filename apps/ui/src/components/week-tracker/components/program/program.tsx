import type { Dispatch, JSX } from "react";

import type { Week, WeekDay } from "@strengthsync/domain/model";

import { DayBlock } from "@/components/week-tracker/components/program/components/day-block/dayBlock";
import { Card, CardContent } from "@/shadcn/ui/card";
import type { WeekAction } from "@/reducers/weekReducer";

type ProgramProps = {
  dispatch: Dispatch<WeekAction>;
  onSaveDay: (day: WeekDay) => Promise<void>;
  week: Week;
};

export function Program({
  dispatch,
  onSaveDay,
  week,
}: ProgramProps): JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col">
        <div className="flex items-center justify-between border-b border-border/50 py-3">
          <span className="text-sm font-bold text-foreground/90">
            Current week
          </span>
        </div>
        {week.schedule.map((day, index) => (
          <DayBlock
            key={day.day_index}
            day={day}
            dispatch={dispatch}
            isFirst={index === 0}
            onSave={onSaveDay}
          />
        ))}
      </CardContent>
    </Card>
  );
}
