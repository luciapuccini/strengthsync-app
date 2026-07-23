import type { Hono } from 'hono'

import { createTestDb } from '@strengthsync/db/testing'
import type { PlanDay, Week } from '@strengthsync/domain/model'

import { createApp, type AppConfig } from './app.ts'

export const BASIC = { username: 'coach', password: 'test-secret' }
export const INTERNAL_SECRET = 'test-internal-secret'

export function basicHeader(): string {
  return `Basic ${btoa(`${BASIC.username}:${BASIC.password}`)}`
}

export function createTestApp(overrides: Partial<AppConfig> = {}): Hono {
  return createApp({
    db: createTestDb(),
    basicAuth: BASIC,
    internalServiceSecret: INTERNAL_SECRET,
    ...overrides,
  })
}

export async function createClientViaApi(app: Hono, displayName = 'Ana'): Promise<{ id: string }> {
  const res = await app.request('/api/clients', {
    method: 'POST',
    headers: { authorization: basicHeader(), 'content-type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  })
  const body = (await res.json()) as { client: { id: string } }
  return body.client
}

export async function upsertProfileViaApi(app: Hono, clientId: string): Promise<void> {
  await app.request(`/api/clients/${clientId}/profile`, {
    method: 'PUT',
    headers: { authorization: basicHeader(), 'content-type': 'application/json' },
    body: JSON.stringify({
      snapshot_date: '2026-07-01',
      sex: 'female',
      age: 34,
      height_cm: 165,
      goals: { primary: 'strength' },
      body_composition: { weight_kg: 62 },
      strength_loads: { press_banca: 60 },
      nutrition: null,
      swimming: null,
      schedule_preferences: null,
      notes: null,
    }),
  })
}

export const weekTemplate: PlanDay[] = [
  {
    day_index: 1,
    type: 'upper_body',
    notes: null,
    exercises: [
      {
        exercise_key: 'press_banca',
        name: 'Bench press',
        series: 4,
        reps: 8,
        rest_time_sec: 120,
        weight_kg: 60,
        notes: null,
      },
    ],
  },
]

export async function activatePlanViaInternalApi(
  app: Hono,
  clientId: string,
  workflowId: string,
): Promise<{ plan: { id: string }; first_week: Week }> {
  const res = await app.request(`/internal/clients/${clientId}/plans/activate-generated`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({
      workflow_id: workflowId,
      plan: { label: 'Block 1', total_weeks: 2, week_template: weekTemplate, rationale: null },
    }),
  })
  return (await res.json()) as { plan: { id: string }; first_week: Week }
}

export function internalHeaders(): Record<string, string> {
  return { 'content-type': 'application/json', 'x-service-secret': INTERNAL_SECRET }
}

export async function completeWeekViaInternalApi(
  app: Hono,
  clientId: string,
  weekId: string,
  workflowId: string,
): Promise<Response> {
  return app.request(`/internal/clients/${clientId}/weeks/${weekId}/complete`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ workflow_id: workflowId }),
  })
}

export async function createNextWeekViaInternalApi(
  app: Hono,
  clientId: string,
  workflowId: string,
  previousWeek: Week,
): Promise<Response> {
  return app.request(`/internal/clients/${clientId}/weeks/next`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({
      workflow_id: workflowId,
      previous_week_id: previousWeek.id,
      schedule: previousWeek.schedule,
    }),
  })
}

export async function patchDayViaApi(
  app: Hono,
  clientId: string,
  weekId: string,
  exercises: unknown[],
  dayIndex = 1,
): Promise<Response> {
  return app.request(`/api/clients/${clientId}/weeks/${weekId}/days/${dayIndex}`, {
    method: 'PATCH',
    headers: { authorization: basicHeader(), 'content-type': 'application/json' },
    body: JSON.stringify({ completed: true, exercises }),
  })
}

/** Mark every scheduled day completed so the week can be frozen. */
export async function markAllDaysCompletedViaApi(
  app: Hono,
  clientId: string,
  week: Week,
): Promise<void> {
  for (const day of week.schedule) {
    if (day.completed) continue
    const res = await patchDayViaApi(
      app,
      clientId,
      week.id,
      day.exercises.map((exercise) => ({
        exercise_key: exercise.exercise_key,
        skipped: false,
        feedback: null,
        sets: [],
      })),
      day.day_index,
    )
    if (!res.ok) {
      throw new Error(`failed to mark day ${day.day_index} completed: ${res.status}`)
    }
  }
}
