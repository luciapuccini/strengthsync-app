-- MVP seed: the single shared coach row that clients reference.
-- The MVP has one coach credential and no per-user identity
-- (docs/architecture/stack.md). Kept out of drizzle migrations so the
-- schema stays environment-neutral; apply after migrations:
--   wrangler d1 execute strengthsync --file ../../services/db/seeds/000_default_coach.sql
INSERT INTO coaches (id, display_name, auth_subject_id, created_at, updated_at)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Coach',
  NULL,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);
