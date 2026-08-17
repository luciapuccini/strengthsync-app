import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { init, identify, capture } = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  capture: vi.fn(),
}));

vi.mock('posthog-js', () => ({ default: { init, identify, capture } }));

const UUID = '00000000-0000-4000-8000-000000000001';

beforeEach(() => {
  window.localStorage.clear();
  vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
  vi.resetModules();
});

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('analytics', () => {
  it('does nothing without a configured project key', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    const { identifyClient, trackDaySaved } = await import('./analytics');

    identifyClient(UUID);
    trackDaySaved();

    expect(init).not.toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('initializes once, with autocapture and session recording off', async () => {
    const { trackDaySaved, trackWeekCompleted } = await import('./analytics');

    trackDaySaved();
    trackWeekCompleted();

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
      }),
    );
    expect(capture).toHaveBeenNthCalledWith(1, 'day saved');
    expect(capture).toHaveBeenNthCalledWith(2, 'week completed');
  });

  it('fires first-set-logged exactly once per client, across calls', async () => {
    const { trackFirstSetLogged } = await import('./analytics');

    trackFirstSetLogged(UUID);
    trackFirstSetLogged(UUID);
    trackFirstSetLogged(UUID);

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('first set logged');
  });

  it('tracks the first set per client independently', async () => {
    const OTHER_UUID = '00000000-0000-4000-8000-000000000002';
    const { trackFirstSetLogged } = await import('./analytics');

    trackFirstSetLogged(UUID);
    trackFirstSetLogged(OTHER_UUID);

    expect(capture).toHaveBeenCalledTimes(2);
  });
});
