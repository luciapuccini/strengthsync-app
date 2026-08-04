import type { WorkflowStatus } from '@strengthsync/domain/contracts'

import { getWorkflowStatus } from '@/api/client'
import { ApiClientError } from '@/api/errors'

const POLL_INTERVAL_MS = 1_500
const POLL_TIMEOUT_MS = 120_000

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

export function isTransientWorkflowError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.kind === 'network' || (error.kind === 'server' && error.status >= 500))
  )
}

/** Poll until the workflow leaves `running`, or until the timeout. */
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
