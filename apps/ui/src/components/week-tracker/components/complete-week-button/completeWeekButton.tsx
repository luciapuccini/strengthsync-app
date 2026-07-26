import { useState } from 'react'
import type { JSX } from 'react'
import { toast } from 'sonner'

import { startWeeklyProgression } from '@/api/client'
import { Button } from '@/shadcn/ui/button'
import { Spinner } from '@/shadcn/ui/spinner'
import { startWorkflowWithRetry, waitForWorkflow } from '@/state/workflowPolling'

type CompleteWeekButtonProps = {
  clientId: string
  weekId: string
}

export function CompleteWeekButton({
  clientId,
  weekId,
}: CompleteWeekButtonProps): JSX.Element {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function completeWeek(): Promise<void> {
    setIsRunning(true)
    setResult(null)
    try {
      const started = await startWorkflowWithRetry(() => startWeeklyProgression(clientId, weekId))
      const status = await waitForWorkflow(started.workflow_id)
      if (status.status === 'running') throw new Error('The workflow is still running.')
      if (status.status === 'failed') throw new Error(status.error.message)
      const resultValue = status.result
      const message =
        'plan_complete' in resultValue && resultValue.plan_complete
          ? 'Plan complete. Generate your next block when you are ready.'
          : 'Week complete. Your next week is ready.'
      setResult(message)
      toast.success(message)
    } catch (error) {
      toast.error('Could not complete the week', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        className="min-h-11 px-3"
        disabled={isRunning}
        onClick={completeWeek}
      >
        {isRunning && <Spinner />}
        {isRunning ? 'Analyzing…' : 'Complete week'}
      </Button>
      {result !== null && <p className="max-w-60 text-right text-xs text-primary">{result}</p>}
    </div>
  )
}
