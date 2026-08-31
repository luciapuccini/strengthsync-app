import { describe, expect, it } from 'vitest';

import { turnoverPhase } from './useTurnover';

describe('turnoverPhase', () => {
  it('reads a complete run as ready', () => {
    expect(turnoverPhase('complete')).toBe('ready');
  });

  it('reads errored and terminated as failed', () => {
    expect(turnoverPhase('errored')).toBe('failed');
    expect(turnoverPhase('terminated')).toBe('failed');
  });

  it('keeps waiting on every other status', () => {
    for (const status of ['queued', 'running', 'paused', 'waiting', 'waitingForPause'] as const) {
      expect(turnoverPhase(status)).toBe('running');
    }
  });

  // A status this client does not know must not read as success.
  it('keeps waiting on an unknown status', () => {
    expect(turnoverPhase('unknown')).toBe('running');
  });
});
