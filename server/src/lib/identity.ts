import {
  claimSubject,
  createClient,
  deleteUnboundClient,
  findClientIdBySubject,
  type Db,
} from '../db/index.ts';

import type { ManagementClient } from './management.ts';

export async function resolveClientId(
  db: Db,
  management: ManagementClient,
  subject: string,
): Promise<string | null> {
  const known = await findClientIdBySubject(db, subject);
  if (known) return known;

  const user = await management.getUser(subject);
  if (!user) return null;

  const client = await createClient(db, { display_name: user.name });
  const { client_id, claimed } = await claimSubject(db, {
    client_id: client.id,
    subject,
    email: user.email,
  });

  if (!claimed) {
    await deleteUnboundClient(db, client.id);
  }
  return client_id;
}
