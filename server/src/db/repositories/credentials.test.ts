import { beforeEach, describe, expect, it } from 'vitest'

import type { Db } from '../db'
import { RepoError } from '../errors'
import { createClient } from '../repositories/clients'
import { createCredential, getCredentialByEmail } from '../repositories/credentials'
import { createTestDb } from '../testing/index'

let db: Db
let clientId: string

beforeEach(async () => {
  db = createTestDb()
  const client = await createClient(db, { display_name: 'Ana' })
  clientId = client.id
})

describe('credentials', () => {
  it('creates a credential and looks it up by email', async () => {
    const created = await createCredential(db, {
      client_id: clientId,
      email: 'Ana@Example.com',
      password_hash: 'hash-1',
    })
    expect(created.client_id).toBe(clientId)
    expect(created.email).toBe('ana@example.com')

    expect(await getCredentialByEmail(db, 'ana@example.com')).toMatchObject({
      client_id: clientId,
      password_hash: 'hash-1',
    })
  })

  it('returns null for an unknown email', async () => {
    expect(await getCredentialByEmail(db, 'nobody@example.com')).toBeNull()
  })

  it('rejects a second credential for an email already in use', async () => {
    await createCredential(db, { client_id: clientId, email: 'ana@example.com', password_hash: 'hash-1' })
    const other = await createClient(db, { display_name: 'Beatriz' })

    await expect(
      createCredential(db, { client_id: other.id, email: 'ana@example.com', password_hash: 'hash-2' }),
    ).rejects.toThrow(RepoError)
  })

  it('normalizes email on write and lookup: trims, lowercases, and collides case-insensitively', async () => {
    await createCredential(db, { client_id: clientId, email: '  Ana@Example.com  ', password_hash: 'hash-1' })

    expect(await getCredentialByEmail(db, 'ANA@EXAMPLE.COM')).toMatchObject({ client_id: clientId })
    expect(await getCredentialByEmail(db, '  ana@example.com  ')).toMatchObject({ client_id: clientId })

    const other = await createClient(db, { display_name: 'Beatriz' })
    await expect(
      createCredential(db, { client_id: other.id, email: 'ANA@EXAMPLE.COM', password_hash: 'hash-2' }),
    ).rejects.toThrow(RepoError)
  })
})
