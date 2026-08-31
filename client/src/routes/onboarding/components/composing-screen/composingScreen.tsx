import type { JSX } from 'react';

import { DAY_TYPE_LABELS } from '@/lib/day-types';
import { Button } from '@/shadcn/ui/button';

import type { ComposingDay, ComposingState } from '../../composingReducer';

type Props = {
  status: 'pending' | 'failed';
  composing: ComposingState;
  onRetry: () => void;
};

function DayRow({ day }: { day: ComposingDay }): JSX.Element {
  return (
    <li className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">Day {day.index}</span> ·{' '}
      {DAY_TYPE_LABELS[day.type]}
      {day.exerciseCount > 0 &&
        ` — ${String(day.exerciseCount)} exercise${day.exerciseCount === 1 ? '' : 's'}`}
    </li>
  );
}

export function ComposingScreen({ status, composing, onRetry }: Props): JSX.Element {
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <p role="alert" className="text-sm text-destructive">
          Something went wrong while building your plan. Please try again.
        </p>
        <Button type="button" size="xl" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-xl font-semibold">
        {composing.header
          ? `${composing.header.label} · ${String(composing.header.totalWeeks)} weeks`
          : 'Building your plan…'}
      </h1>

      {composing.days.length > 0 && (
        <ul className="flex flex-col gap-2">
          {composing.days.map((day) => (
            <DayRow key={day.index} day={day} />
          ))}
        </ul>
      )}

      {composing.phase !== 'generating' && (
        <p className="text-sm text-muted-foreground">Saving your plan…</p>
      )}
    </div>
  );
}
