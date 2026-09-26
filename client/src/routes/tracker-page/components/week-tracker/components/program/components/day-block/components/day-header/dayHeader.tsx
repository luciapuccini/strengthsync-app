import { ChevronDown } from 'lucide-react';
import type { JSX } from 'react';

import type { WeekDay } from '@/api/types';

import { Badge } from '@/shadcn/ui/badge';
import { Button } from '@/shadcn/ui/button';
import { Spinner } from '@/shadcn/ui/spinner';

const DAY_TYPE_LABELS: Record<WeekDay['type'], string> = {
  upper_body: 'Upper body',
  leg_day: 'Leg day',
  full_body: 'Full body',
  activity: 'Activity',
  cardio: 'Cardio',
  rest: 'Rest',
};

type DayHeaderProps = {
  day: WeekDay;
  isOpen: boolean;
  isSaving: boolean;
  onSave: () => void;
  onToggle: () => void;
};

export function DayHeader({
  day,
  isOpen,
  isSaving,
  onSave,
  onToggle,
}: DayHeaderProps): JSX.Element {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="flex min-h-11 flex-1 flex-wrap items-center gap-2 text-left"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? '' : '-rotate-90'}`}
          aria-hidden
        />
        <Badge
          className={
            day.type === 'upper_body'
              ? 'border-primary/20 bg-primary/15 text-primary'
              : 'bg-foreground/10 text-foreground/70'
          }
        >
          {DAY_TYPE_LABELS[day.type]}
        </Badge>
        <span className="text-sm font-semibold text-muted-foreground">
          Day {day.day_index} · {day.date}
        </span>
        {day.completed && (
          <Badge className="border-primary/20 bg-primary/15 text-primary">Done</Badge>
        )}
      </button>
      <Button
        size="sm"
        variant="outline"
        className="ml-auto min-h-11"
        disabled={isSaving}
        onClick={onSave}
      >
        {isSaving && <Spinner />}
        {isSaving ? 'Saving…' : 'Save day'}
      </Button>
    </div>
  );
}
