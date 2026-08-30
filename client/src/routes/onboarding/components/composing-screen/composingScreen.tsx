import type { JSX } from 'react';

import { DAY_TYPE_LABELS } from '@/lib/day-types';
import { Button } from '@/shadcn/ui/button';

import type { ComposingDay, ComposingState } from '../../composingReducer';

type Props = {
  status: 'pending' | 'failed';
  composing: ComposingState;
  onRetry: () => void;
};

/**
 * One line per training day: its focus, and for a day that holds lifts, how
 * many. Rest, activity and cardio days carry no count and read plainly as
 * what they are.
 *
 * Deliberately not the tracker's day rendering: this previews a screen the
 * athlete reaches a second later, and duplicating exercise-level rendering
 * here would mean maintaining two of it forever.
 */
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

/**
 * What the athlete watches while their first plan is written. There is no
 * animation here any more: rows filling in one at a time say more than an orb
 * could, and the `thinking-orbs` dependency went with it.
 *
 * Replaces the wizard for the whole submit-through-generate request — the form
 * is not left on screen mid-request — and retry re-runs generation only.
 *
 * Presentational: it draws whatever the reducer has folded out of the stream
 * so far, and none of it is authoritative — the plan the athlete trains from
 * is the one the tracker reads back out of the database a moment later.
 */
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

      {/* Covers the write and the tracker's refetch, so the pause after the
          last row does not read as a freeze. */}
      {composing.phase !== 'generating' && (
        <p className="text-sm text-muted-foreground">Saving your plan…</p>
      )}
    </div>
  );
}
