import { useCallback, useEffect, useState } from 'react';

import { invalidateActivePlan } from '@/api/activePlanResource';
import type { WorkflowStatus } from '@/api/types';
import { currentWeekResource, invalidateCurrentWeek } from '@/api/weekResource';
import { getTurnoverStatus, startWeeklyProgression } from '@/api/workflows';
import { trackWeekCompleted } from '@/lib/analytics';
import { useAppStore } from '@/store/useAppStore';

export type TurnoverPhase = 'idle' | 'running' | 'ready' | 'failed';

const POLL_MS = 3_000;
const GIVE_UP_MS = 5 * 60_000;

const FAILED = 'We could not build next week. Ask your coach to look at it.';
const SLOW = 'This is taking longer than usual. Come back in a few minutes.';

export function turnoverPhase(status: WorkflowStatus): Exclude<TurnoverPhase, 'idle'> {
  if (status === 'complete') return 'ready';
  if (status === 'errored' || status === 'terminated') return 'failed';
  return 'running';
}

export type Turnover = {
  phase: TurnoverPhase;
  message: string | null;
  start: () => Promise<void>;
};

export function useTurnover(): Turnover {
  const [phase, setPhase] = useState<TurnoverPhase>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void getTurnoverStatus()
      .then((status) => {
        if (live && status !== null && turnoverPhase(status) === 'running') setPhase('running');
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    let live = true;
    const deadline = Date.now() + GIVE_UP_MS;

    const tick = async (): Promise<void> => {
      const status = await getTurnoverStatus().catch(() => null);
      if (!live) return;
      const next = status === null ? 'running' : turnoverPhase(status);

      if (next === 'failed') {
        setMessage(FAILED);
        setPhase('failed');
        return;
      }
      if (next === 'ready') {
        invalidateCurrentWeek();
        invalidateActivePlan();
        const data = await currentWeekResource();
        if (!live) return;
        useAppStore.getState().hydrateTracker(data);
        setPhase('ready');
        return;
      }
      if (Date.now() > deadline) {
        setMessage(SLOW);
        setPhase('failed');
      }
    };

    const id = setInterval(() => void tick(), POLL_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [phase]);

  const start = useCallback(async (): Promise<void> => {
    setMessage(null);
    setPhase('running');
    try {
      await startWeeklyProgression();
      trackWeekCompleted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : FAILED);
      setPhase('failed');
    }
  }, []);

  return { phase, message, start };
}
