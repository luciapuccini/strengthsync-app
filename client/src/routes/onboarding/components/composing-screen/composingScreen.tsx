import { ThinkingOrb } from 'thinking-orbs';
import type { JSX } from 'react';

import { Button } from '@/shadcn/ui/button';

type Props = {
  status: 'pending' | 'failed';
  onRetry: () => void;
};

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
 */
export function ComposingScreen({ status, onRetry }: Props): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <ThinkingOrb
        state="composing"
        size={64}
        paused={status === 'failed'}
        aria-label={status === 'pending' ? 'Composing your plan' : 'Plan generation paused'}
      />

      {status === 'pending' ? (
        <p className="text-lg font-medium">Building your plan…</p>
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
