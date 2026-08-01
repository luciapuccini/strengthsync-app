import type { WorkflowStatus } from '@strengthsync/domain/contracts'

import { getWorkflowStatus } from '@/api/client'
import { ApiClientError } from '@/api/errors'

const POLL_INTERVAL_MS = 1_500
const POLL_TIMEOUT_MS = 120_000
const START_RETRY_ATTEMPTS = 3

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

export function isTransientWorkflowError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.kind === 'network' || (error.kind === 'server' && error.status >= 500))
  )
}

/**
 * Workflow starts are idempotent, so retrying a transient proxy error safely
 * retrieves the execution that may already have been accepted upstream.
 */
export async function startWorkflowWithRetry<T>(start: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= START_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await start()
    } catch (error) {
      if (!isTransientWorkflowError(error) || attempt === START_RETRY_ATTEMPTS) throw error
      await delay(POLL_INTERVAL_MS)
    }
  }
  throw new Error('Workflow start retry loop exited unexpectedly.')
}

export async function waitForWorkflow(workflowId: string): Promise<WorkflowStatus> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    let status: WorkflowStatus
    try {
      status = await getWorkflowStatus(workflowId)
    } catch (error) {
      if (!isTransientWorkflowError(error)) throw error
      await delay(POLL_INTERVAL_MS)
      continue
    }
    if (status.status !== 'running') return status
    await delay(POLL_INTERVAL_MS)
  }
  throw new Error('The workflow is still running. Check again in a moment.')
}
