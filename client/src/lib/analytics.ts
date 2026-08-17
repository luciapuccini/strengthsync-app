import posthog from 'posthog-js';

const POSTHOG_KEY: string | undefined = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST: string = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com';

const FIRST_SET_LOGGED_KEY_PREFIX = 'strengthsync:analytics:first-set-logged:';

let initialized = false;

/**
 * No-ops with no project key configured, so local dev and CI never talk to
 * PostHog. `autocapture`/`capture_pageview`/session recording are all off:
 * the funnel is seven hand-written events (docs/mvp.md §5), and this is a
 * logged-in health app — nothing implicit should leave the browser.
 */
function ensureInit(): boolean {
  if (initialized) return true;
  if (!POSTHOG_KEY) return false;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    person_profiles: 'identified_only',
  });
  initialized = true;
  return true;
}

/** Ties every later event to the athlete. Call on session bootstrap and on sign-in/sign-up. */
export function identifyClient(clientId: string): void {
  if (!ensureInit()) return;
  posthog.identify(clientId);
}

export type OnboardingStep = 'personal' | 'goal' | 'training' | 'life';

export function trackOnboardingStepCompleted(step: OnboardingStep): void {
  if (!ensureInit()) return;
  posthog.capture('onboarding step completed', { step });
}

export function trackPlanGenerationStarted(): void {
  if (!ensureInit()) return;
  posthog.capture('plan generation started');
}

export function trackPlanGenerationSucceeded(latencyMs: number): void {
  if (!ensureInit()) return;
  posthog.capture('plan generation succeeded', { latency_ms: latencyMs });
}

export function trackPlanGenerationFailed(latencyMs: number): void {
  if (!ensureInit()) return;
  posthog.capture('plan generation failed', { latency_ms: latencyMs });
}

/**
 * Fires once per client, ever — a set toggled back off and on again is not a
 * second activation. The flag lives in localStorage, alongside the week
 * draft (`weekDraftStorage.ts`), keyed the same way.
 */
export function trackFirstSetLogged(clientId: string): void {
  try {
    if (window.localStorage.getItem(FIRST_SET_LOGGED_KEY_PREFIX + clientId) !== null) return;
  } catch {
    // Storage unavailable: fall through and capture, best effort.
  }
  if (!ensureInit()) return;
  posthog.capture('first set logged');
  try {
    window.localStorage.setItem(FIRST_SET_LOGGED_KEY_PREFIX + clientId, '1');
  } catch {
    // Missing the flag only risks one duplicate capture on the next set.
  }
}

export function trackDaySaved(): void {
  if (!ensureInit()) return;
  posthog.capture('day saved');
}

export function trackWeekCompleted(): void {
  if (!ensureInit()) return;
  posthog.capture('week completed');
}
