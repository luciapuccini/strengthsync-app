-- Local-only Auth0 identity for the seeded Lucia demo athlete.
-- The subject was verified in the shared tenant; it is an identifier, not a secret.
-- Keep the password in the team's private password manager and never add it here.
-- Apply after 001_demo_seed.sql. Do not apply this seed to production D1.

INSERT OR IGNORE INTO client_identities (
  client_id,
  subject,
  email,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000000010',
  'auth0|6a88223f4b33b4ee6e23b372',
  'hello@strengthsync.ai',
  '2026-09-14T00:00:00.000Z',
  '2026-09-14T00:00:00.000Z'
);
