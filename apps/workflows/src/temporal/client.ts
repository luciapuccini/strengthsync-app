import { Client, Connection } from '@temporalio/client'

import { connectionOptions, TEMPORAL_NAMESPACE } from '../config.ts'

let clientPromise: Promise<Client> | undefined

/** Lazy singleton: one gRPC connection reused across requests. */
export function getTemporalClient(): Promise<Client> {
  clientPromise ??= (async () => {
    try {
      const connection = await Connection.connect(connectionOptions)
      return new Client({ connection, namespace: TEMPORAL_NAMESPACE })
    } catch (err) {
      // Allow a later request to retry the connection.
      clientPromise = undefined
      throw err
    }
  })()
  return clientPromise
}
