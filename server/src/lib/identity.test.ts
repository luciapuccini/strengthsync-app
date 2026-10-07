import { beforeEach, describe, expect, it, vi } from 'vitest';

import { claimSubject, createClient, findClientIdBySubject, type Db } from '../db/index.ts';
import { clients } from '../db/schema.ts';
import { createTestDb } from '../db/testing/index.ts';

import { resolveClientId } from './identity.ts';
import type { ManagementClient, ManagementUser } from './management.ts';

const SUBJECT = 'auth0|68a1f3c0d2b4e5f6a7b8c9d0';

const user: ManagementUser = {
  subject: SUBJECT,
  email: 'ana@example.test',
  name: 'Ana',
};

function stubManagement(getUser: ManagementClient['getUser']): ManagementClient {
  return { getUser: vi.fn(getUser), deleteUser: vi.fn(async () => {}) };
}

const found = () => stubManagement(async () => user);
const missing = () => stubManagement(async () => null);

const countClients = async (db: Db): Promise<number> =>
  (await db.select({ id: clients.id }).from(clients)).length;

let db: Db;

beforeEach(() => {
  db = createTestDb();
});

describe('resolveClientId', () => {
  it('returns the athlete a known subject already belongs to', async () => {
    const client = await createClient(db, { display_name: 'Ana' });
    await claimSubject(db, { client_id: client.id, subject: SUBJECT, email: user.email });
    const management = found();

    await expect(resolveClientId(db, management, SUBJECT)).resolves.toBe(client.id);
    expect(management.getUser).not.toHaveBeenCalled();
  });

  it('provisions an athlete the first time a subject is seen', async () => {
    const clientId = await resolveClientId(db, found(), SUBJECT);

    expect(clientId).not.toBeNull();
    await expect(findClientIdBySubject(db, SUBJECT)).resolves.toBe(clientId);
    await expect(countClients(db)).resolves.toBe(1);
  });

  it('names the provisioned athlete from the provider', async () => {
    const clientId = await resolveClientId(db, found(), SUBJECT);

    const rows = await db.select().from(clients);
    expect(rows[0]).toMatchObject({ id: clientId, display_name: 'Ana', status: 'active' });
  });

  it('resolves two simultaneous first requests to one athlete', async () => {
    const [first, second] = await Promise.all([
      resolveClientId(db, found(), SUBJECT),
      resolveClientId(db, found(), SUBJECT),
    ]);

    expect(first).toBe(second);
  });

  it('leaves no orphaned athlete behind when a first request loses the race', async () => {
    await Promise.all([
      resolveClientId(db, found(), SUBJECT),
      resolveClientId(db, found(), SUBJECT),
    ]);

    await expect(countClients(db)).resolves.toBe(1);
  });

  it('returns null when the provider has no user for a subject it signed for', async () => {
    await expect(resolveClientId(db, missing(), SUBJECT)).resolves.toBeNull();
    await expect(countClients(db)).resolves.toBe(0);
  });
});
