import { ThinkingOrb } from 'thinking-orbs';
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
 * The orb is `thinking-orbs` (https://github.com/Jakubantalik/thinking-orbs,
 * live configurator at https://orbs.jakubantalik.com) — a published npm
 * package, not a copy-pasted export. Its only runtime dependency is the
 * `react` peer we already carry: the animation is a plain 2D `<canvas>`, no
 * WebGL, no extra libraries, so this adds no measurable bundle weight for a
 * screen every client sees once per account. Declared through the
 * workspace's single-version catalog like every other shared dependency.
 *
 * Replaces the wizard for the whole submit-through-generate request — the
 * form is not left on screen mid-request. On failure the orb freezes
 * (`paused`) rather than unmounting, and retry re-runs generation only.
 *
 * Presentational: it draws whatever the reducer has folded out of the stream
 * so far, and none of it is authoritative — the plan the athlete trains from
 * is the one the tracker reads back out of the database a moment later.
 */
export function ComposingScreen({ status, composing, onRetry }: Props): JSX.Element {
  const inFlight = status === 'pending';

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      {inFlight && composing.header && (
        <h1 className="text-xl font-semibold">
          {composing.header.label} · {composing.header.totalWeeks} weeks
        </h1>
      )}

      <ThinkingOrb
        state="composing"
        size={64}
        paused={status === 'failed'}
        aria-label={inFlight ? 'Composing your plan' : 'Plan generation paused'}
      />

      {inFlight ? (
        <>
          <p className="text-lg font-medium">Building your plan…</p>
          {composing.days.length > 0 && (
            <ul className="flex flex-col gap-2">
              {composing.days.map((day) => (
                <DayRow key={day.index} day={day} />
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <p role="alert" className="text-sm text-destructive">
            Something went wrong while building your plan. Please try again.
          </p>
          <Button type="button" size="xl" onClick={onRetry}>
            Retry
          </Button>
        </>
      )}
    </div>
  );
}
