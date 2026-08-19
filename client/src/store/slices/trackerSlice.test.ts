import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Client } from '@/api/types';

import {
  setFeedback as applySetFeedback,
  toggleSet as applyToggleSet,
  toggleSkip as applyToggleSkip,
} from '@/reducers/weekReducer';
import { makeWeek } from '@/test/weekFixture';

const { saveDayLog } = vi.hoisted(() => ({ saveDayLog: vi.fn() }));
const { invalidateCurrentWeek } = vi.hoisted(() => ({
  invalidateCurrentWeek: vi.fn(),
}));

// `getMe` is here for the session slice, which the store composes alongside
// this one — a factory that omitted it would fail at import.
vi.mock('@/api/client', () => ({ saveDayLog, getMe: vi.fn() }));
vi.mock('@/api/weekResource', () => ({ invalidateCurrentWeek }));

import { useAppStore } from '../useAppStore';

const UUID = '00000000-0000-4000-8000-000000000001';
const NEXT_WEEK_UUID = '00000000-0000-4000-8000-000000000002';
const NOW = '2026-07-23T00:00:00.000Z';
const DRAFT_STORAGE_KEY = `strengthsync:week-draft:${UUID}`;

const client: Client = {
  id: UUID,
  coach_id: UUID,
  display_name: 'Lucia',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
};

beforeEach(() => {
  window.localStorage.clear();
  useAppStore.setState({ client: null, plan: null, week: null }, false);
});

afterEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('trackerSlice', () => {
  it('hydrates client/plan/week from a resolved resource', () => {
    const week = makeWeek();
    useAppStore.getState().hydrateTracker({ client, plan: null, week });

    expect(useAppStore.getState().client).toEqual(client);
    expect(useAppStore.getState().week).toEqual(week);
  });
});

describe('trackerSlice draft persistence', () => {
  it('persists toggleSkip as the exact pure transition result', () => {
    const week = makeWeek();
    const expected = applyToggleSkip(week, 1, 'bench_press');
    useAppStore.getState().hydrateTracker({ client, plan: null, week });

    useAppStore.getState().toggleSkip(1, 'bench_press');

    expect(useAppStore.getState().week).toEqual(expected);
    expect(JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? 'null')).toEqual(expected);
  });

  it('persists toggleSet as the exact pure transition result', () => {
    const week = makeWeek();
    useAppStore.getState().hydrateTracker({ client, plan: null, week });
    const withSet = applyToggleSet(week, 1, 'bench_press', 0);

    useAppStore.getState().toggleSet(1, 'bench_press', 0);

    expect(useAppStore.getState().week).toEqual(withSet);
    expect(JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? 'null')).toEqual(withSet);

    const undone = applyToggleSet(withSet, 1, 'bench_press', 0);
    useAppStore.getState().toggleSet(1, 'bench_press', 0);

    expect(useAppStore.getState().week).toEqual(undone);
    expect(JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? 'null')).toEqual(undone);
  });

  it('restores a matching stored draft when server data hydrates again', () => {
    const week = makeWeek();
    const expected = applyToggleSkip(week, 1, 'bench_press');
    useAppStore.getState().hydrateTracker({ client, plan: null, week });
    useAppStore.getState().toggleSkip(1, 'bench_press');
    useAppStore.setState({ client: null, plan: null, week: null }, false);

    useAppStore.getState().hydrateTracker({ client, plan: null, week });

    expect(useAppStore.getState().week?.schedule).toEqual(expected.schedule);
  });

  it('keeps a matching draft after saveDay', async () => {
    const week = makeWeek();
    const expected = applyToggleSkip(week, 1, 'bench_press');
    const savedWeek = {
      ...week,
      schedule: week.schedule.map((day) => (day.day_index === 1 ? expected.schedule[0]! : day)),
    };
    useAppStore.getState().hydrateTracker({ client, plan: null, week });
    useAppStore.getState().toggleSkip(1, 'bench_press');
    saveDayLog.mockResolvedValue(savedWeek);

    await useAppStore.getState().saveDay(expected.schedule[0]!);
    expect(useAppStore.getState().week?.schedule).toEqual(expected.schedule);
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
  });

  it('clears the client draft when a different week hydrates', () => {
    const week = makeWeek();
    useAppStore.getState().hydrateTracker({ client, plan: null, week });
    useAppStore.getState().toggleSkip(1, 'bench_press');
    const nextWeek = { ...week, id: NEXT_WEEK_UUID };

    useAppStore.getState().hydrateTracker({ client, plan: null, week: nextWeek });

    expect(useAppStore.getState().week).toEqual(nextWeek);
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('clears a malformed client draft during hydration', () => {
    const week = makeWeek();
    window.localStorage.setItem(DRAFT_STORAGE_KEY, 'not-json');

    useAppStore.getState().hydrateTracker({ client, plan: null, week });

    expect(useAppStore.getState().week).toEqual(week);
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});

describe('trackerSlice feedback draft persistence', () => {
  it('persists setFeedback as the exact pure transition result', () => {
    const week = makeWeek();
    useAppStore.getState().hydrateTracker({ client, plan: null, week });
    const withFeedback = applySetFeedback(week, 1, 'bench_press', 'heavy');

    useAppStore.getState().setFeedback(1, 'bench_press', 'heavy');

    expect(useAppStore.getState().week).toEqual(withFeedback);
    expect(JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? 'null')).toEqual(
      withFeedback,
    );

    const cleared = applySetFeedback(withFeedback, 1, 'bench_press', null);
    useAppStore.getState().setFeedback(1, 'bench_press', null);

    expect(useAppStore.getState().week).toEqual(cleared);
    expect(JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? 'null')).toEqual(cleared);
  });
});

describe('trackerSlice API orchestration', () => {
  it('is a no-op mutating sets/feedback before the tracker is hydrated', () => {
    useAppStore.getState().toggleSet(1, 'bench_press', 0);
    expect(useAppStore.getState().week).toBeNull();
  });

  it('saveDay trusts the server day over a draft with a stale completed flag', async () => {
    const week = makeWeek();
    const completeDay = {
      ...week.schedule[0]!,
      completed: true,
      exercises: [
        {
          ...week.schedule[0]!.exercises[0]!,
          sets: [
            { performed_reps: 8, performed_weight_kg: 30 },
            { performed_reps: 8, performed_weight_kg: 30 },
          ],
        },
      ],
    };
    const staleDraftWeek = {
      ...week,
      schedule: [{ ...completeDay, completed: false }, week.schedule[1]!],
    };
    const savedWeek = { ...week, schedule: [completeDay, week.schedule[1]!] };
    useAppStore.getState().hydrateTracker({ client, plan: null, week });
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(staleDraftWeek));
    saveDayLog.mockResolvedValue(savedWeek);

    await useAppStore.getState().saveDay(completeDay);

    expect(useAppStore.getState().week?.schedule[0]?.completed).toBe(true);
  });

  it('saveDay persists exercise logs only and applies the server completed day', async () => {
    const week = makeWeek();
    const savedWeek = {
      ...week,
      schedule: [{ ...week.schedule[0]!, completed: true }, week.schedule[1]!],
    };
    useAppStore.getState().hydrateTracker({ client, plan: null, week });
    saveDayLog.mockResolvedValue(savedWeek);

    await useAppStore.getState().saveDay(week.schedule[0]!);

    expect(saveDayLog).toHaveBeenCalledWith(week.id, 1, {
      exercises: [
        {
          exercise_key: 'bench_press',
          skipped: false,
          feedback: null,
          sets: [],
        },
      ],
    });
    expect(invalidateCurrentWeek).toHaveBeenCalledWith();
    expect(useAppStore.getState().week).toEqual(savedWeek);
  });

  it('saveDay rejects before the tracker is hydrated', async () => {
    await expect(useAppStore.getState().saveDay(makeWeek().schedule[0]!)).rejects.toThrow();
  });
});
