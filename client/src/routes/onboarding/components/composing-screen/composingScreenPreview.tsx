import { useState } from 'react';
import type { JSX } from 'react';

import { Button } from '@/shadcn/ui/button';

import { ComposingScreen } from './composingScreen';

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
      <ComposingScreen status={status} onRetry={() => setStatus('pending')} />
    </div>
  );
}
