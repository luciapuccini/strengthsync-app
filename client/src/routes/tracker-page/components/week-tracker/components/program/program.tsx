import type { JSX } from 'react';

import { DayBlock } from '@/routes/tracker-page/components/week-tracker/components/program/components/day-block/dayBlock';
import { Card, CardContent } from '@/shadcn/ui/card';
import { useAppStore } from '@/store/useAppStore';

export function Program(): JSX.Element {
  const week = useAppStore((s) => s.week)!;
  return (
    <Card>
      <CardContent className="flex flex-col">
        <div className="flex items-center justify-between border-b border-border/50 py-3">
          <span className="text-sm font-bold text-foreground/90">Current week</span>
        </div>
        {week.schedule.map((day, index) => (
          <DayBlock key={day.day_index} day={day} isFirst={index === 0} />
        ))}
      </CardContent>
    </Card>
  );
}
