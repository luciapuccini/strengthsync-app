import type { JSX } from 'react';

import { useTurnover } from '@/routes/tracker-page/components/turnover/useTurnover';
import { Button } from '@/shadcn/ui/button';
import { Spinner } from '@/shadcn/ui/spinner';

export function CompleteWeekButton(): JSX.Element {
  const { phase, message, start } = useTurnover();
  const isRunning = phase === 'running';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" className="min-h-11 px-3" disabled={isRunning} onClick={() => void start()}>
        {isRunning && <Spinner />}
        {isRunning ? 'Analyzing…' : 'Complete week'}
      </Button>
      {message !== null && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
