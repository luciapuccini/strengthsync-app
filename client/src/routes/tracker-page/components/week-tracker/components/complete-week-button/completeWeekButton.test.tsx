import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { startWeeklyProgression, waitForWeeklyProgression, refreshTracker } = vi.hoisted(() => ({
  startWeeklyProgression: vi.fn(),
  waitForWeeklyProgression: vi.fn(),
  refreshTracker: vi.fn(),
}));

vi.mock('@/api/workflows', () => ({ startWeeklyProgression, waitForWeeklyProgression }));
vi.mock('@/store/useAppStore', () => {
  const state = { refreshTracker };
  const useAppStore = (selector: (s: typeof state) => unknown) => selector(state);
  useAppStore.getState = () => state;
  return { useAppStore };
});

import { CompleteWeekButton } from './completeWeekButton';

const button = () => screen.getByRole('button');

beforeEach(() => {
  startWeeklyProgression.mockResolvedValue({ instanceId: 'client-1-run', details: {} });
  refreshTracker.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function press(): Promise<void> {
  await act(async () => {
    fireEvent.click(button());
  });
}

describe('completing a week', () => {
  it('stops analyzing and reloads the tracker once the workflow completes', async () => {
    waitForWeeklyProgression.mockResolvedValue('complete');
    render(<CompleteWeekButton />);

    await press();

    expect(waitForWeeklyProgression).toHaveBeenCalledWith('client-1-run');
    expect(refreshTracker).toHaveBeenCalled();
    expect(button()).not.toHaveTextContent(/analyzing/i);
  });

  it('stays disabled while the workflow runs', async () => {
    waitForWeeklyProgression.mockReturnValue(new Promise(() => {}));
    render(<CompleteWeekButton />);

    await press();

    expect(button()).toHaveTextContent(/analyzing/i);
    expect(button()).toBeDisabled();
  });

  it('re-enables after the workflow fails, so the athlete can retry', async () => {
    waitForWeeklyProgression.mockResolvedValue('failed');
    render(<CompleteWeekButton />);

    await press();

    expect(refreshTracker).toHaveBeenCalled();
    expect(button()).toBeEnabled();
  });

  it('stays disabled when the workflow status cannot be read', async () => {
    waitForWeeklyProgression.mockRejectedValue(new Error('network'));
    render(<CompleteWeekButton />);

    await press();

    expect(button()).toBeDisabled();
  });
});
