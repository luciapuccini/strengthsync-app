import { useState } from 'react';
import type { JSX } from 'react';

import { Button } from '@/shadcn/ui/button';

import type { ComposingState } from '../../composingReducer';

import { ComposingScreen } from './composingScreen';

/** A mid-generation week, so the rows can be reviewed without a model call. */
const SAMPLE: ComposingState = {
  header: { label: 'Upper/Lower Strength', totalWeeks: 6 },
  days: [
    { index: 1, type: 'upper_body', exerciseCount: 5 },
    { index: 2, type: 'rest', exerciseCount: 0 },
    { index: 3, type: 'leg_day', exerciseCount: 4 },
    { index: 4, type: 'cardio', exerciseCount: 0 },
  ],
  phase: 'generating',
};

/**
 * Dev-only route (`/dev/composing`, registered only when `import.meta.env.DEV`)
 * so the orb animation and both screen states can be reviewed without waiting
 * on a real generation request. Never mounted in a production build.
 */
export function ComposingScreenPreview(): JSX.Element {
  const [status, setStatus] = useState<'pending' | 'failed'>('pending');

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex justify-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setStatus('pending')}>
          Show pending
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setStatus('failed')}>
          Show failed
        </Button>
      </div>
      <ComposingScreen status={status} composing={SAMPLE} onRetry={() => setStatus('pending')} />
    </div>
  );
}
