import { serve } from '@hono/node-server'

import { connectionTarget, WORKFLOW_API_PORT } from '../config.ts'
import { getTemporalClient } from '../temporal/client.ts'
import { createTemporalLauncher } from '../temporal/launcher.ts'
import { createWorkflowApi } from './app.ts'

const serviceSecret = process.env.WORKFLOW_SERVICE_SECRET
if (!serviceSecret) {
  console.error('[workflow-api] WORKFLOW_SERVICE_SECRET is required')
  process.exit(1)
}

const app = createWorkflowApi({
  serviceSecret,
  launcher: createTemporalLauncher(getTemporalClient),
})

serve({ fetch: app.fetch, port: WORKFLOW_API_PORT }, (info) => {
  console.log(`[workflow-api] listening on :${info.port} (${connectionTarget})`)
})
