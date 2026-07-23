import { describe, expect, it } from 'vitest'

import type { Plan, Week } from '@strengthsync/domain/model'

import {
  activatePlanViaInternalApi,
  basicHeader,
  completeWeekViaInternalApi,
  createClientViaApi,
  createNextWeekViaInternalApi,
  createTestApp,
  internalHeaders,
  markAllDaysCompletedViaApi,
  patchDayViaApi,
  upsertProfileViaApi,
  weekTemplate,
} from './testkit.ts'

const performedSets = [
  { performed_reps: 8, performed_weight_kg: 60 },
  { performed_reps: 8, performed_weight_kg: 60 },
]

const dayLog = [
  { exercise_key: 'press_banca', skipped: false, feedback: 'hard', sets: performedSets },
]

/** Seed a client with profile, an activated plan, and its week 1 completed. */
async function setupCompletedFirstWeek(app: ReturnType<typeof createTestApp>) {
  const client = await createClientViaApi(app)
  await upsertProfileViaApi(app, client.id)
  const { plan, first_week } = await activatePlanViaInternalApi(app, client.id, 'wf-activate-1')
  await patchDayViaApi(app, client.id, first_week.id, dayLog)
  await completeWeekViaInternalApi(app, client.id, first_week.id, 'wf-weekly-1')
  return { client, plan, first_week }
}

describe('week tracking + weekly progression', () => {
  it('rejects completing a week with incomplete days', async () => {
    const app = createTestApp()
    const client = await createClientViaApi(app)
    await upsertProfileViaApi(app, client.id)
    const { first_week } = await activatePlanViaInternalApi(app, client.id, 'wf-activate-1')

    const res = await completeWeekViaInternalApi(app, client.id, first_week.id, 'wf-weekly-1')
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'week_days_incomplete',
    )
  })

  it('tracks a day, completes the week immutably, and creates the next week', async () => {
    const app = createTestApp()
    const { client, first_week } = await setupCompletedFirstWeek(app)

    const current = await app.request(`/api/clients/${client.id}/weeks/${first_week.id}`, {
      headers: { authorization: basicHeader() },
    })
    const week = ((await current.json()) as { week: Week }).week
    expect(week.status).toBe('completed')
    expect(week.schedule[0]?.exercises[0]?.sets).toHaveLength(2)

    // A completed week is immutable through public routes.
    const patch = await patchDayViaApi(app, client.id, first_week.id, dayLog)
    expect(patch.status).toBe(400)

    // Weekly context feeds the LLM analysis step.
    const context = await app.request(
      `/internal/clients/${client.id}/weekly-context?weekId=${first_week.id}`,
      { headers: internalHeaders() },
    )
    expect(context.status).toBe(200)
    expect(((await context.json()) as { coaching_rules: string }).coaching_rules).toContain(
      'pushed weekly',
    )

    // The next week becomes the current one; the completed week is retained.
    const next = await createNextWeekViaInternalApi(app, client.id, 'wf-weekly-1', week)
    expect(next.status).toBe(200)
    const nextWeek = ((await next.json()) as { week: Week }).week
    expect(nextWeek.week_index).toBe(2)
    expect(nextWeek.start_date > week.start_date).toBe(true)

    const inFlight = await app.request(`/api/clients/${client.id}/weeks/current`, {
      headers: { authorization: basicHeader() },
    })
    expect(((await inFlight.json()) as { week: Week }).week.id).toBe(nextWeek.id)
    const completed = await app.request(`/api/clients/${client.id}/weeks?status=completed`, {
      headers: { authorization: basicHeader() },
    })
    expect(((await completed.json()) as { weeks: Week[] }).weeks).toHaveLength(1)
  })
})

describe('plan turnover', () => {
  it('activates a generated plan, archives the old one, and retains history', async () => {
    const app = createTestApp()
    const { client, first_week } = await setupCompletedFirstWeek(app)

    // Complete the plan's final week (week 2 of 2).
    const next = await createNextWeekViaInternalApi(app, client.id, 'wf-weekly-1', first_week)
    const week2 = ((await next.json()) as { week: Week }).week
    await markAllDaysCompletedViaApi(app, client.id, week2)
    await completeWeekViaInternalApi(app, client.id, week2.id, 'wf-weekly-2')

    const context = await app.request(`/internal/clients/${client.id}/plan-generation-context`, {
      headers: internalHeaders(),
    })
    expect(
      ((await context.json()) as { completed_weeks: Week[] }).completed_weeks,
    ).toHaveLength(2)

    const second = await activatePlanViaInternalApi(app, client.id, 'wf-activate-2')
    const plans = await app.request(`/api/clients/${client.id}/plans`, {
      headers: { authorization: basicHeader() },
    })
    const planList = ((await plans.json()) as { plans: Plan[] }).plans
    expect(planList).toHaveLength(2)
    expect(planList.find((p) => p.id === second.plan.id)?.status).toBe('active')
    expect(planList.filter((p) => p.status === 'archived')).toHaveLength(1)

    const history = await app.request(`/api/clients/${client.id}/weeks?status=completed`, {
      headers: { authorization: basicHeader() },
    })
    expect(((await history.json()) as { weeks: Week[] }).weeks).toHaveLength(2)
  })

  it('returns first-plan context with null active_plan', async () => {
    const app = createTestApp()
    const client = await createClientViaApi(app)
    await upsertProfileViaApi(app, client.id)

    const context = await app.request(`/internal/clients/${client.id}/plan-generation-context`, {
      headers: internalHeaders(),
    })
    expect(context.status).toBe(200)
    const body = (await context.json()) as {
      active_plan: Plan | null
      completed_weeks: Week[]
    }
    expect(body.active_plan).toBeNull()
    expect(body.completed_weeks).toEqual([])
  })

  it('rejects plan-generation context while an active plan is unfinished', async () => {
    const app = createTestApp()
    const client = await createClientViaApi(app)
    await upsertProfileViaApi(app, client.id)
    await activatePlanViaInternalApi(app, client.id, 'wf-activate-1')

    const context = await app.request(`/internal/clients/${client.id}/plan-generation-context`, {
      headers: internalHeaders(),
    })
    expect(context.status).toBe(400)
    expect(((await context.json()) as { error: { code: string } }).error.code).toBe(
      'plan_not_complete',
    )
  })
})

describe('template sanity', () => {
  it('test fixture template has one exercise on day 1', () => {
    expect(weekTemplate[0]?.exercises).toHaveLength(1)
  })
})
