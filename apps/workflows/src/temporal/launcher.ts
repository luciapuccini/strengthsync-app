import {
  WorkflowExecutionAlreadyStartedError,
  WorkflowNotFoundError,
  WorkflowIdReusePolicy,
  type Client,
} from '@temporalio/client'

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

/** Start/status/retry surface used by the workflow-start API. */
export type WorkflowLauncher = {
  startWeeklyProgression(input: WeeklyProgressionInput): Promise<StartResult>
  startPlanGeneration(input: PlanGenerationInput): Promise<StartResult>
  getStatus(workflowId: string): Promise<WorkflowStatus | null>
  /** Re-starts a failed workflow with the same id; null when unknown. */
  retry(workflowId: string): Promise<StartResult | null>
}

export type StartResult = { workflowId: string; alreadyRunning: boolean }

export class WorkflowNotFailedError extends Error {
  constructor(workflowId: string) {
    super(`workflow ${workflowId} has not failed; retry is only allowed after a failure`)
    this.name = 'WorkflowNotFailedError'
  }
}

export type ParsedWorkflowId =
  | { type: 'weekly_progression'; input: WeeklyProgressionInput }
  | { type: 'plan_generation'; input: PlanGenerationInput }

export function weeklyProgressionWorkflowId(input: WeeklyProgressionInput): string {
  return `weekly-progression:${input.client_id}:${input.week_id}`
}

/**
 * Date-suffixed so a new plan cycle gets a fresh id, while a duplicate
 * start on the same day still maps to the running execution.
 */
export function planGenerationWorkflowId(clientId: string): string {
  return `plan-generation:${clientId}:${new Date().toISOString().slice(0, 10)}`
}

export function parseWorkflowId(workflowId: string): ParsedWorkflowId | null {
  const [kind, clientId, third] = workflowId.split(':')
  if (kind === 'weekly-progression' && clientId && third) {
    return { type: 'weekly_progression', input: { client_id: clientId, week_id: third } }
  }
  if (kind === 'plan-generation' && clientId && third) {
    return { type: 'plan_generation', input: { client_id: clientId } }
  }
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
    try {
      await client.workflow.start(workflowType, {
        taskQueue: TASK_QUEUE,
        workflowId,
        args: [input],
        // Duplicate start for the same logical job returns the running
        // execution; re-start after a failure is allowed (retry path).
        workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY,
      })
      return { workflowId, alreadyRunning: false }
    } catch (err) {
      if (err instanceof WorkflowExecutionAlreadyStartedError) {
        return { workflowId, alreadyRunning: true }
      }
      throw err
    }
  }

  async function getStatus(workflowId: string): Promise<WorkflowStatus | null> {
    const parsed = parseWorkflowId(workflowId)
    if (!parsed) return null
    const client = await getClient()
    const handle = client.workflow.getHandle(workflowId)
    let description
    try {
      description = await handle.describe()
    } catch (err) {
      if (err instanceof WorkflowNotFoundError) return null
      throw err
    }
    return toWorkflowStatus(workflowId, parsed.type, description.status.name, {
      startedAt: description.startTime,
      closeTime: description.closeTime,
      result: () => handle.result(),
    })
  }

  async function retry(workflowId: string): Promise<StartResult | null> {
    const parsed = parseWorkflowId(workflowId)
    if (!parsed) return null
    const status = await getStatus(workflowId)
    if (!status) return null
    if (status.status !== 'failed') throw new WorkflowNotFailedError(workflowId)
    // Same deterministic id: the FAILED_ONLY reuse policy permits the
    // re-start precisely because the previous execution failed.
    // Note: plan-generation retry loses optional coach notes (documented).
    return start(workflowId, parsed.type === 'weekly_progression' ? 'weekly' : 'plan', parsed.input)
  }

  return {
    startWeeklyProgression: (input) => start(weeklyProgressionWorkflowId(input), 'weekly', input),
    startPlanGeneration: (input) => start(planGenerationWorkflowId(input.client_id), 'plan', input),
    getStatus,
    retry,
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
