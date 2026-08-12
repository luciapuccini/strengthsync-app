-- Credential for the seeded demo athlete (client 00000000-0000-4000-8000-000000000010),
-- who owns the only plan, weeks and history in the repository. Without this
-- row the tracker and history screens are unreachable by hand once
-- authentication lands. Apply after migrations, 000_default_coach.sql and
-- 001_demo_seed.sql.
--
-- Dev sign-in:
--   email:    lucia@example.com
--   password: dev-password-123
--
-- This password is deliberately committed for local development. It is safe
-- only because no `:remote` seed script applies it — see the auth PRD's
-- Further Notes ("The demo credential is committed on purpose").
--
-- The hash below was produced by:
--   pnpm hash-password "dev-password-123"

INSERT OR IGNORE INTO client_credentials (
  client_id,
  email,
  password_hash,
  created_at
) VALUES (
  '00000000-0000-4000-8000-000000000010',
  'lucia@example.com',
  'pbkdf2-sha256$30000$Ed19yuvhwIIAzQ4XfwLJxA==$lUogWhhJaOeuAm0q2cOJPXW6o3LafR008gF5IHM3j84=',
  '2026-08-12T00:00:00.000Z'
);
