import type { WorkflowStatus } from '@strengthsync/domain/contracts'

import { getWorkflowStatus } from '@/api/client'

const POLL_INTERVAL_MS = 1_500
const POLL_TIMEOUT_MS = 120_000

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

export async function waitForWorkflow(workflowId: string): Promise<WorkflowStatus> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    const status = await getWorkflowStatus(workflowId)
    if (status.status !== 'running') return status
    await delay(POLL_INTERVAL_MS)
  }
  throw new Error('The workflow is still running. Check again in a moment.')
}
