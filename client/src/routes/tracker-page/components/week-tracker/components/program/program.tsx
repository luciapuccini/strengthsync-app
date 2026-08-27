import type { JSX } from 'react';

import { DayBlock } from '@/routes/tracker-page/components/week-tracker/components/program/components/day-block/dayBlock';
import { Card, CardContent } from '@/shadcn/ui/card';
import { useAppStore } from '@/store/useAppStore';

export function Program(): JSX.Element {
  const week = useAppStore((s) => s.week)!;
  return (
    <Card>
      <CardContent className="flex flex-col">
        {week.schedule.map((day, index) => (
          <DayBlock key={day.day_index} day={day} isFirst={index === 0} />
        ))}
      </CardContent>
    </Card>
  );
}
