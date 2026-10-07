import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Plan } from '@/api/types';

import { makeWeek } from '@/test/weekFixture';

const { completedWeeksResource } = vi.hoisted(() => ({ completedWeeksResource: vi.fn() }));

vi.mock('@/api/historyResource', () => ({ completedWeeksResource }));

import { HistoryPage } from './historyPage';

const plan: Plan = {
  id: '00000000-0000-4000-8000-000000000001',
  client_id: '00000000-0000-4000-8000-000000000001',
  label: 'Strength Block #1',
  status: 'active',
  total_weeks: 6,
  week_template: [],
  rationale: null,
  activated_at: null,
  created_at: '2026-07-20T00:00:00.000Z',
  updated_at: '2026-07-20T00:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderHistory(): Promise<void> {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <HistoryPage />
      </Suspense>,
    );
  });
}

describe('HistoryPage export', () => {
  it('does not show the export action when there are no completed weeks', async () => {
    completedWeeksResource.mockReturnValue(Promise.resolve({ weeks: [], plan: null }));
    await renderHistory();

    expect(screen.getByText('No completed weeks.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull();
  });

  it('downloads the plan as a CSV file named after the plan', async () => {
    completedWeeksResource.mockReturnValue(Promise.resolve({ weeks: [makeWeek()], plan }));
    const createObjectURL = vi.fn(() => 'blob:history');
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    let fileName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      fileName = this.download;
    });
    await renderHistory();

    expect(screen.getByText('Strength Block #1')).toBeTruthy();
    expect(screen.getByText('1 completed week')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(fileName).toMatch(/^strengthsync-strength-block-1-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

describe('HistoryPage week stepper', () => {
  it('opens on the latest week and steps back and forward', async () => {
    const weeks = [
      { ...makeWeek(), week_index: 1 },
      { ...makeWeek(), week_index: 2 },
    ];
    completedWeeksResource.mockReturnValue(Promise.resolve({ weeks, plan }));
    await renderHistory();

    const previous = screen.getByRole('button', { name: 'Previous week' });
    const next = screen.getByRole('button', { name: 'Next week' });
    expect(screen.getByRole('heading', { name: 'Week 2 of 6' })).toBeTruthy();
    expect(next.hasAttribute('disabled')).toBe(true);

    fireEvent.click(previous);
    expect(screen.getByRole('heading', { name: 'Week 1 of 6' })).toBeTruthy();
    expect(previous.hasAttribute('disabled')).toBe(true);

    fireEvent.click(next);
    expect(screen.getByRole('heading', { name: 'Week 2 of 6' })).toBeTruthy();
  });
});
