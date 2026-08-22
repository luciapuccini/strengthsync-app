import { afterEach, describe, expect, it, vi } from 'vitest';

import type { UpdateClientProfile } from '@/api/types';
import { makeWeek } from '@/test/weekFixture';

const { mockGet, mockPost, mockPut, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockPatch: vi.fn(),
}));

vi.mock('openapi-fetch', () => ({
  default: () => ({
    GET: mockGet,
    POST: mockPost,
    PUT: mockPut,
    PATCH: mockPatch,
  }),
}));

import {
  authorizedFetch,
  getActivePlan,
  getMe,
  getPlan,
  getProfile,
  listCompletedWeeks,
  saveDayLog,
  setAccessTokenProvider,
  setUnauthorizedHandler,
  updateDayLog,
  updateProfile,
} from './client';
import { ApiClientError } from './errors';

const UUID = '00000000-0000-4000-8000-000000000001';
const PLAN = '00000000-0000-4000-8000-000000000002';
const NOW = '2026-05-10T00:00:00.000Z';

const profileBody: UpdateClientProfile = {
  snapshot_date: '2026-07-01',
  sex: 'female',
  age: 34,
  height_in: 165,
  goals: { primary: 'strength' },
  body_composition: { weight_lb: 62 },
  strength_loads: { press_banca: 60 },
  nutrition: null,
  activities: null,
  schedule_preferences: null,
  notes: null,
};

const samplePlan = {
  id: PLAN,
  client_id: UUID,
  label: 'Block A',
  status: 'active' as const,
  total_weeks: 6,
  week_template: [],
  rationale: null,
  activated_at: NOW,
  created_at: NOW,
  updated_at: NOW,
};

function okResponse<T>(data: T) {
  return { data, error: undefined, response: { ok: true, status: 200 } as Response };
}

function errorResponse(status: number, error: unknown) {
  return { data: undefined, error, response: { ok: false, status } as Response };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  // Both of these are module state, so they outlive the test that registered
  // them.
  setUnauthorizedHandler(() => {});
  setAccessTokenProvider(async () => null);
});

/**
 * The credential, which is the one thing every call above has in common. These
 * exercise `authorizedFetch` directly rather than through `openapi-fetch`, which
 * this file mocks out wholesale — the wrapper is what is under test, not the
 * plumbing that hands it a `Request`.
 */
describe('the bearer wrapper', () => {
  const sentTo = (fetchMock: ReturnType<typeof vi.fn>): Request =>
    fetchMock.mock.calls[0]?.[0] as Request;

  function stubFetch() {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('carries the token from the registered provider', async () => {
    const fetchMock = stubFetch();
    setAccessTokenProvider(async () => 'a-token');

    await authorizedFetch(new Request('https://api.test/api/me'));

    expect(sentTo(fetchMock).headers.get('Authorization')).toBe('Bearer a-token');
  });

  // Not an error, and deliberately not a thrown one: the athlete is signed out,
  // or the SDK has not registered a provider yet, and the honest thing to do is
  // send the request without a credential and let the server answer 401 — which
  // is what signs them out everywhere else in this file.
  it('sends no header when there is no token to send', async () => {
    const fetchMock = stubFetch();
    setAccessTokenProvider(async () => null);

    await authorizedFetch(new Request('https://api.test/api/me'));

    expect(sentTo(fetchMock).headers.has('Authorization')).toBe(false);
  });

  it('sends no header before any provider is registered', async () => {
    const fetchMock = stubFetch();

    await authorizedFetch(new Request('https://api.test/api/me'));

    expect(sentTo(fetchMock).headers.has('Authorization')).toBe(false);
  });
});

describe('api client', () => {
  it('reads through a session-addressed path, with no athlete id', async () => {
    mockGet.mockResolvedValue(okResponse({ plan: samplePlan }));
    await expect(getActivePlan()).resolves.toEqual(samplePlan);
    expect(mockGet).toHaveBeenCalledWith('/api/me/plans/active');
  });

  it('reads the signed-in athlete from /api/me', async () => {
    const client = { id: UUID, coach_id: UUID, display_name: 'Ana', status: 'active' as const };
    mockGet.mockResolvedValue(okResponse({ client }));
    await expect(getMe()).resolves.toEqual(client);
    expect(mockGet).toHaveBeenCalledWith('/api/me');
  });

  it('puts the body and parses the saved profile', async () => {
    const profile = { id: UUID, client_id: UUID, age: 34 };
    mockPut.mockResolvedValue(okResponse({ profile }));
    await expect(updateProfile(profileBody)).resolves.toEqual(profile);
    expect(mockPut).toHaveBeenCalledWith('/api/me/profile', { body: profileBody });
  });

  it('maps a 401 to an unauthorized error', async () => {
    mockGet.mockResolvedValue(
      errorResponse(401, { error: { code: 'unauthorized', message: 'nope' } }),
    );
    await expect(getActivePlan()).rejects.toMatchObject({ kind: 'unauthorized', status: 401 });
  });

  it('treats a 404 profile as "no profile yet"', async () => {
    mockGet.mockResolvedValue(
      errorResponse(404, { error: { code: 'profile_not_found', message: 'none' } }),
    );
    await expect(getProfile()).resolves.toBeNull();
    expect(mockGet).toHaveBeenCalledWith('/api/me/profile');
  });

  it('surfaces a network failure as a network error', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    await expect(getActivePlan()).rejects.toBeInstanceOf(ApiClientError);
    await expect(getActivePlan()).rejects.toMatchObject({ kind: 'network' });
  });

  it('posts a save-day body and parses the returned week', async () => {
    const week = makeWeek();
    const body = { exercises: [] };
    mockPost.mockResolvedValue(okResponse({ week }));
    await expect(saveDayLog(UUID, 2, body)).resolves.toEqual(week);
    expect(mockPost).toHaveBeenCalledWith('/api/me/weeks/{weekId}/days/{dayIndex}/save', {
      params: { path: { weekId: UUID, dayIndex: 2 } },
      body,
    });
  });
});

// There is no `describe('auth')` block any more. Every case in it addressed a
// route deleted by `issues/011-amputate-old-auth.md` — sign-up, sign-in,
// sign-out and the session read — and none is restored here: Auth0's hosted page
// replaces all four, so there is no API call left to test.
// `GET /api/me` is the nearest successor and is covered above, but it replaces
// only what the session read did — report who this is — not what sign-in did.
// `issues/013-web-app-universal-login.md` adds the bearer-attaching wrapper.

describe('unauthorized handler', () => {
  it('runs on an unauthorized response from any call, and still rejects', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockGet.mockResolvedValue(
      errorResponse(401, { error: { code: 'unauthorized', message: 'sign in required' } }),
    );

    await expect(getActivePlan()).rejects.toBeInstanceOf(ApiClientError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('leaves other failures alone', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockGet.mockResolvedValue(
      errorResponse(404, { error: { code: 'not_found', message: 'no such thing' } }),
    );

    // `getPlan`, not `getActivePlan`: the latter maps a 404 to null by design,
    // so it would resolve rather than reject.
    await expect(getPlan(PLAN)).rejects.toBeInstanceOf(ApiClientError);
    expect(handler).not.toHaveBeenCalled();
  });

  it('is not reached by a network failure, which is not an auth verdict', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockGet.mockRejectedValue(new Error('offline'));

    await expect(getPlan(PLAN)).rejects.toMatchObject({ kind: 'network' });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('listCompletedWeeks', () => {
  it('lists completed weeks for a plan and passes the query params', async () => {
    const week = { ...makeWeek(), status: 'completed' as const };
    mockGet.mockResolvedValue(okResponse({ weeks: [week] }));
    await expect(listCompletedWeeks(PLAN)).resolves.toEqual([week]);
    expect(mockGet).toHaveBeenCalledWith('/api/me/weeks', {
      params: { query: { status: 'completed', planId: PLAN } },
    });
  });
});

describe('getPlan', () => {
  it('fetches a plan by id and parses the response', async () => {
    mockGet.mockResolvedValue(okResponse({ plan: samplePlan }));
    await expect(getPlan(PLAN)).resolves.toEqual(samplePlan);
    expect(mockGet).toHaveBeenCalledWith('/api/me/plans/{planId}', {
      params: { path: { planId: PLAN } },
    });
  });
});

describe('updateDayLog', () => {
  it('patches a day and parses the returned week', async () => {
    const week = makeWeek();
    const body = { completed: true, exercises: [] };
    mockPatch.mockResolvedValue(okResponse({ week }));
    await expect(updateDayLog(UUID, 2, body)).resolves.toEqual(week);
    expect(mockPatch).toHaveBeenCalledWith('/api/me/weeks/{weekId}/days/{dayIndex}', {
      params: { path: { weekId: UUID, dayIndex: 2 } },
      body,
    });
  });
});
