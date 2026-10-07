import {
  deleteClient,
  deleteIdentity,
  deletePlans,
  deleteProfile,
  deleteWeeks,
  findSubjectByClientId,
  type Db,
} from '../db/index.ts';

import type { ManagementClient } from './management.ts';

export async function deleteAccount(
  db: Db,
  management: ManagementClient,
  clientId: string,
): Promise<void> {
  const subject = await findSubjectByClientId(db, clientId);

  if (subject) await management.deleteUser(subject);

  await deleteIdentity(db, clientId);

  await deleteWeeks(db, clientId);
  await deletePlans(db, clientId);
  await deleteProfile(db, clientId);
  await deleteClient(db, clientId);
}
