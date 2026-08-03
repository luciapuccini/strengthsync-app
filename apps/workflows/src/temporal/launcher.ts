import { WorkflowNotFoundError, type Client } from '@temporalio/client'

import type {
  PlanGenerationInput,
  PlanGenerationResult,
  WeeklyProgressionInput,
  WeeklyProgressionResult,
  WorkflowStatus,
  WorkflowType,
} from '@strengthsync/domain/contracts'

import { TASK_QUEUE } from '../config.ts'
import { planGenerationWorkflow } from '../workflows/plan-generation.ts'
import { weeklyProgressionWorkflow } from '../workflows/weekly-progression.ts'

/** Start/status surface used by the workflow-start API. */
export type WorkflowLauncher = {
  startWeeklyProgression(input: WeeklyProgressionInput): Promise<StartResult>
  startPlanGeneration(input: PlanGenerationInput): Promise<StartResult>
  getStatus(workflowId: string): Promise<WorkflowStatus | null>
}

export type StartResult = { workflowId: string }

/** Colon-safe UTC timestamp for readable unique workflow ids. */
export function workflowIdTimestamp(date = new Date()): string {
  return date.toISOString().replaceAll(':', '-')
}

export function weeklyProgressionWorkflowId(input: WeeklyProgressionInput, date = new Date()): string {
  return `weekly-progression:${input.client_id}:${input.week_id}:${workflowIdTimestamp(date)}`
}

export function planGenerationWorkflowId(clientId: string, date = new Date()): string {
  return `plan-generation:${clientId}:${workflowIdTimestamp(date)}`
}

/** Recover workflow type from id prefix. Timestamp and input details are ignored. */
export function parseWorkflowId(workflowId: string): WorkflowType | null {
  const [kind, clientId, third] = workflowId.split(':')
  if (kind === 'weekly-progression' && clientId && third) return 'weekly_progression'
  if (kind === 'plan-generation' && clientId && third) return 'plan_generation'
  return null
}

const FAILED_STATUSES = new Set(['FAILED', 'CANCELED', 'TERMINATED', 'TIMED_OUT'])

export function createTemporalLauncher(getClient: () => Promise<Client>): WorkflowLauncher {
  async function start(
    workflowId: string,
    workflow: 'weekly' | 'plan',
    input: WeeklyProgressionInput | PlanGenerationInput,
  ): Promise<StartResult> {
    const client = await getClient()
    const workflowType = workflow === 'weekly' ? weeklyProgressionWorkflow : planGenerationWorkflow
    await client.workflow.start(workflowType, {
      taskQueue: TASK_QUEUE,
      workflowId,
      args: [input],
    })
    return { workflowId }
  }

  async function getStatus(workflowId: string): Promise<WorkflowStatus | null> {
    const type = parseWorkflowId(workflowId)
    if (!type) return null
    const client = await getClient()
    const handle = client.workflow.getHandle(workflowId)
    let description
    try {
      description = await handle.describe()
    } catch (err) {
      if (err instanceof WorkflowNotFoundError) return null
      throw err
    }
    return toWorkflowStatus(workflowId, type, description.status.name, {
      startedAt: description.startTime,
      closeTime: description.closeTime,
      result: () => handle.result(),
    })
  }

  return {
    startWeeklyProgression: (input) => start(weeklyProgressionWorkflowId(input), 'weekly', input),
    startPlanGeneration: (input) => start(planGenerationWorkflowId(input.client_id), 'plan', input),
    getStatus,
  }
}

type StatusDetails = {
  startedAt: Date | undefined
  closeTime: Date | undefined
  result: () => Promise<unknown>
}

async function toWorkflowStatus(
  workflowId: string,
  type: WorkflowType,
  statusName: string,
  details: StatusDetails,
): Promise<WorkflowStatus | null> {
  const startedAt = details.startedAt?.toISOString() ?? new Date(0).toISOString()
  if (statusName === 'RUNNING') {
    return { workflow_id: workflowId, type, status: 'running', started_at: startedAt }
  }
  const finishedAt = (details.closeTime ?? new Date()).toISOString()
  if (statusName === 'COMPLETED') {
    const result = (await details.result()) as WeeklyProgressionResult | PlanGenerationResult
    return {
      workflow_id: workflowId,
      type,
      status: 'succeeded',
      started_at: startedAt,
      finished_at: finishedAt,
      result,
    }
  }
  if (FAILED_STATUSES.has(statusName)) {
    return {
      workflow_id: workflowId,
      type,
      status: 'failed',
      started_at: startedAt,
      finished_at: finishedAt,
      error: { code: statusName.toLowerCase(), message: await safeErrorMessage(details.result) },
    }
  }
  return null
}

/** A safe, truncated failure message: never raw prompts, model output, or credentials. */
async function safeErrorMessage(result: () => Promise<unknown>): Promise<string> {
  try {
    await result()
    return 'workflow failed'
  } catch (err) {
    const raw = err instanceof Error ? (err.cause instanceof Error ? err.cause.message : err.message) : ''
    return (raw || 'workflow failed').slice(0, 300)
  }
}
