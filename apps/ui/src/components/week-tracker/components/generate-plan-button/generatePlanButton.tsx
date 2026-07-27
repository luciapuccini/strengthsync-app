import { useState } from 'react'
import type { JSX } from 'react'
import { toast } from 'sonner'

import { startPlanGeneration } from '@/api/client'
import { Button } from '@/shadcn/ui/button'
import { Spinner } from '@/shadcn/ui/spinner'
import { invalidateCurrentWeek } from '@/api/weekResource'
import { waitForWorkflow } from '@/api/workflowPolling'

type GeneratePlanButtonProps = {
  clientId: string
}

export function GeneratePlanButton({ clientId }: GeneratePlanButtonProps): JSX.Element {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function generatePlan(): Promise<void> {
    setIsRunning(true)
    setResult(null)
    try {
      const started = await startPlanGeneration(clientId)
      const status = await waitForWorkflow(started.workflow_id)
      if (status.status === 'running') throw new Error('The workflow is still running.')
      if (status.status === 'failed') throw new Error(status.error.message)
      const message = 'Your new training block is active.'
      setResult(message)
      invalidateCurrentWeek(clientId)
      toast.success(message)
    } catch (error) {
      toast.error('Could not generate a plan', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        className="min-h-11 px-3"
        disabled={isRunning}
        onClick={generatePlan}
      >
        {isRunning && <Spinner />}
        {isRunning ? 'Generating…' : 'Generate plan'}
      </Button>
      {result !== null && <p className="max-w-60 text-right text-xs text-primary">{result}</p>}
    </div>
  )
}
