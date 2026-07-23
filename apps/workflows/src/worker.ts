import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { NativeConnection, Worker } from '@temporalio/worker'

import * as planGeneration from './activities/plan-generation.ts'
import * as weeklyProgression from './activities/weekly-progression.ts'
import { connectionOptions, connectionTarget, TASK_QUEUE, TEMPORAL_NAMESPACE } from './config.ts'

const workflowsPath = resolve(dirname(fileURLToPath(import.meta.url)), 'workflows/index.ts')
const activities = { ...planGeneration, ...weeklyProgression }

async function run() {
  const connection = await NativeConnection.connect(connectionOptions)
  try {
    const worker = await Worker.create({
      connection,
      namespace: TEMPORAL_NAMESPACE,
      taskQueue: TASK_QUEUE,
      workflowsPath,
      activities,
    })
    console.log(
      `[temporal-worker] polling task queue "${TASK_QUEUE}" (namespace "${TEMPORAL_NAMESPACE}") on ${connectionTarget}`,
    )
    // worker.run() resolves on SIGINT/SIGTERM by default (graceful shutdown).
    await worker.run()
  } finally {
    await connection.close()
  }
}

run().catch((err) => {
  console.error('[temporal-worker] fatal error', err)
  process.exit(1)
})
