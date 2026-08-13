import { eq } from 'drizzle-orm';

import type { ClientCredentials } from '../../domain/model/index.ts';

import { nowIso } from '../dates.ts';
import type { Db } from '../db.ts';
import { RepoError } from '../errors.ts';
import { clientCredentials } from '../schema.ts';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getCredentialByEmail(
  db: Db,
  email: string,
): Promise<ClientCredentials | null> {
  const rows = await db
    .select()
    .from(clientCredentials)
    .where(eq(clientCredentials.email, normalizeEmail(email)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCredential(
  db: Db,
  input: Pick<ClientCredentials, 'client_id' | 'email' | 'password_hash'>,
): Promise<ClientCredentials> {
  const email = normalizeEmail(input.email);
  const existing = await getCredentialByEmail(db, email);
  if (existing) {
    throw new RepoError(
      'conflict',
      'email_already_registered',
      `email ${email} is already registered`,
    );
  }
  const credential: ClientCredentials = {
    client_id: input.client_id,
    email,
    password_hash: input.password_hash,
    created_at: nowIso(),
  };
  await db.insert(clientCredentials).values(credential);
  return credential;
}
