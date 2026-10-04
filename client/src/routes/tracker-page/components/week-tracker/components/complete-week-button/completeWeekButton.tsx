import { useState } from 'react';
import type { JSX } from 'react';
import { toast } from 'sonner';

import { startWeeklyProgression, waitForWeeklyProgression } from '@/api/workflows';
import { trackWeekCompleted } from '@/lib/analytics';
import { Button } from '@/shadcn/ui/button';
import { Spinner } from '@/shadcn/ui/spinner';
import { useAppStore } from '@/store/useAppStore';

export function CompleteWeekButton({
  variant = 'default',
  size = 'sm',
  disabled = false,
}: {
  variant?: 'default' | 'outline';
  size?: 'sm' | 'xl';
  disabled?: boolean;
}): JSX.Element {
  const [isRunning, setIsRunning] = useState(false);
  const refreshTracker = useAppStore((s) => s.refreshTracker);

  async function completeWeek(): Promise<void> {
    setIsRunning(true);
    let instanceId: string;
    try {
      ({ instanceId } = await startWeeklyProgression());
    } catch (error) {
      setIsRunning(false);
      toast.error('Could not complete the week', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }
    trackWeekCompleted();
    toast.success('Building next week…');

    let outcome: 'complete' | 'failed';
    try {
      outcome = await waitForWeeklyProgression(instanceId);
    } catch {
      toast.error('Could not check on next week', {
        description: 'Reload the page in a minute to see it.',
      });
      return;
    }
    if (outcome === 'failed') toast.error('Could not build next week');
    try {
      await refreshTracker();
    } catch {
      toast.error('Could not reload the tracker', { description: 'Reload the page to see it.' });
    }
    setIsRunning(false);
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={size === 'sm' ? 'min-h-11 px-3' : undefined}
      disabled={disabled || isRunning}
      onClick={completeWeek}
    >
      {isRunning && <Spinner />}
      {isRunning ? 'Analyzing…' : 'Complete week'}
    </Button>
  );
}
