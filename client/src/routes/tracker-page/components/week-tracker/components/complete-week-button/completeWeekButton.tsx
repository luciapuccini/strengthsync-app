import { useState } from 'react';
import type { JSX } from 'react';
import { toast } from 'sonner';

import { startWeeklyProgression } from '@/api/workflows';
import { trackWeekCompleted } from '@/lib/analytics';
import { Button } from '@/shadcn/ui/button';
import { Spinner } from '@/shadcn/ui/spinner';

export function CompleteWeekButton(): JSX.Element {
  const [isRunning, setIsRunning] = useState(false);

  async function completeWeek(): Promise<void> {
    setIsRunning(true);
    try {
      await startWeeklyProgression();
      trackWeekCompleted();
      toast.success('Building next week…');
      // Deliberately left running on success. The POST returns as soon as the
      // workflow instance is created, but the workflow itself takes another
      // thirty to sixty seconds of model calls, and the endpoint creates its
      // instance without an explicit id — so re-enabling here would let a
      // second press start a second turnover on the same week.
    } catch (error) {
      setIsRunning(false);
      toast.error('Could not complete the week', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return (
    <Button size="sm" className="min-h-11 px-3" disabled={isRunning} onClick={completeWeek}>
      {isRunning && <Spinner />}
      {isRunning ? 'Analyzing…' : 'Complete week'}
    </Button>
  );
}
