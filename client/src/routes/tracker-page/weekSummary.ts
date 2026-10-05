import type { Week } from '@/api/types';

export type WeekSummary = {
  recordedDays: number;
  plannedDays: number;
  endWeekday: string;
};

export function weekSummary(week: Week): WeekSummary {
  const trainingDays = week.schedule.filter((day) => day.type !== 'rest');
  return {
    recordedDays: trainingDays.filter((day) => day.completed).length,
    plannedDays: trainingDays.length,
    endWeekday: new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(
      new Date(`${week.end_date}T00:00:00Z`),
    ),
  };
}
