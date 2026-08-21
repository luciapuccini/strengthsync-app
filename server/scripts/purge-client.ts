import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createManagementClient, type ManagementClient } from '../src/lib/management.ts';

/**
 * Remove an athlete's rows from D1 after their Auth0 user has already been
 * deleted by hand in the dashboard.
 *
 * This is the operator's half of a deletion that started at the provider rather
 * than in the app. `DELETE /api/account` — the path an athlete takes, and the
 * one App Store Guideline 5.1.1(v) is about — needs the athlete's own token and
 * does both halves itself; see `src/lib/account-deletion.ts`. Deleting from the
 * Auth0 dashboard instead stops any *new* token being minted and touches nothing
 * local, so every row that athlete ever wrote stays behind, unreachable and
 * uncounted. That is the gap this closes.
 *
 * It also handles the other shape of orphan: a `clients` row with no identity
 * pointing at it, which is what the loser of a provisioning race leaves if
 * `deleteUnboundClient` never ran, and what a cascade that died part-way leaves.
 * Pass `--client-id` for those, since there is no email to find them by.
 *
 * Run with `node --experimental-strip-types`, like `gen-openapi.ts` — .nvmrc
 * pins 22.14.0, which needs the flag.
 *
 *   pnpm --filter @strengthsync/server purge:client -- --email a@b.com
 *   pnpm --filter @strengthsync/server purge:client -- --email a@b.com --confirm
 *
 * Dry run unless `--confirm` is passed. `--local` targets the local D1 instead
 * of production, which is where this should be rehearsed first.
 *
 * ## The refusal that is the point of the script
 *
 * It aborts if the Auth0 user still exists. `resolveClientId` provisions
 * unconditionally on a subject it has not seen, so deleting these rows while the
 * provider still has the user does not delete the athlete — the next request
 * carrying their token recreates them as a new, empty account, and the deletion
 * reverses itself into something that looks like the app erased their training
 * and left them signed in. `account-deletion.ts` spends its whole comment on
 * this; the same hazard applies here, with nothing to enforce the order except
 * this check, because the operator is doing the two halves days apart in
 * different tools.
 *
 * ## Why raw SQL and not the repositories
 *
 * The repositories take a `Db`, which is Drizzle bound to a `D1Database`, and
 * that binding only exists inside a Worker. A Node script has no way to hold
 * one. So the foreign-key order below is a second copy of the one in
 * `account-deletion.ts` and will not be caught by a typechecker if that one
 * changes — the comment there and this one point at each other for that reason.
 * `scripts/` is outside `tsconfig.json`'s `include`, so pre-commit does not
 * typecheck this file either.
 */

type Target = {
  clientId: string;
  /** Null for an orphan `clients` row: nothing at the provider to check. */
  subject: string | null;
  email: string | null;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = resolve(HERE, '..');
const DB_NAME = 'strengthsync';

function fail(message: string): never {
  console.error(`purge-client: ${message}`);
  process.exit(1);
}

/**
 * A SQL string literal. Every value reaching here is an email, a UUID or an
 * Auth0 subject supplied by the operator on the command line, so this is the
 * boundary where that stops being trusted input.
 */
function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function flag(argv: string[], name: string): string | null {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return null;
  const value = argv[at + 1];
  if (value === undefined || value.startsWith('--')) fail(`--${name} needs a value`);
  return value;
}

/**
 * `wrangler d1 execute --json` prints the result array, but not always alone —
 * warnings and the version banner share stdout. Slicing from the first bracket
 * is what makes this robust to a wrangler that decides to say hello.
 */
function d1(sql: string, remote: boolean): Array<Record<string, unknown>> {
  const args = [
    'wrangler',
    'd1',
    'execute',
    DB_NAME,
    remote ? '--remote' : '--local',
    '--json',
    '--command',
    sql,
  ];
  let stdout: string;
  try {
    stdout = execFileSync('pnpm', ['exec', ...args], {
      cwd: SERVER_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
  } catch {
    fail('wrangler failed; the message above is its own');
  }
  const start = stdout.indexOf('[');
  if (start === -1) fail(`could not find JSON in wrangler output:\n${stdout}`);
  const parsed = JSON.parse(stdout.slice(start)) as Array<{
    results?: Array<Record<string, unknown>>;
  }>;
  return parsed[0]?.results ?? [];
}

/**
 * JSONC is not JSON: `wrangler.jsonc` carries both line comments and trailing
 * commas, and `JSON.parse` refuses each. Two passes rather than one because the
 * trailing-comma pass has to run on text a comment can no longer hide a brace
 * inside. Both alternate a string literal against the thing being removed and
 * hand the literal back untouched, which is what keeps the `//` in `https://`
 * from being mistaken for a comment and a comma inside a string from being
 * mistaken for a trailing one.
 */
function stripJsoncComments(raw: string): string {
  const keepStrings = (match: string): string => (match.startsWith('"') ? match : '');
  return raw
    .replace(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, keepStrings)
    .replace(/"(?:\\.|[^"\\])*"|,(?=\s*[}\]])/g, keepStrings);
}

/**
 * The Auth0 values live in `wrangler.jsonc` as `vars` and are read from there
 * rather than restated here: they are public, but a third copy that can drift
 * from the Worker's is exactly what the comment in that file argues against.
 */
function readWranglerVars(): Record<string, string> {
  const raw = readFileSync(resolve(SERVER_ROOT, 'wrangler.jsonc'), 'utf8');
  const config = JSON.parse(stripJsoncComments(raw)) as { vars?: Record<string, string> };
  return config.vars ?? {};
}

/**
 * The one real secret. `wrangler secret` holds production's copy and will not
 * read it back, so this takes the environment first and falls back to
 * `.dev.vars` — the same tenant backs both, so the dev copy authenticates fine
 * against the users the dashboard shows.
 */
function readM2mSecret(): string {
  const fromEnv = process.env.AUTH0_M2M_CLIENT_SECRET;
  if (fromEnv) return fromEnv;
  let devVars: string;
  try {
    devVars = readFileSync(resolve(SERVER_ROOT, '.dev.vars'), 'utf8');
  } catch {
    fail('set AUTH0_M2M_CLIENT_SECRET, or put it in server/.dev.vars');
  }
  const line = devVars.split('\n').find((l) => l.startsWith('AUTH0_M2M_CLIENT_SECRET='));
  if (!line) fail('AUTH0_M2M_CLIENT_SECRET is not in server/.dev.vars');
  return line.slice('AUTH0_M2M_CLIENT_SECRET='.length).trim();
}

function management(): ManagementClient {
  const vars = readWranglerVars();
  const issuerDomain = vars.AUTH0_ISSUER_DOMAIN;
  const tenantDomain = vars.AUTH0_TENANT_DOMAIN;
  const clientId = vars.AUTH0_M2M_CLIENT_ID;
  if (!issuerDomain || !tenantDomain || !clientId) {
    fail('wrangler.jsonc is missing the AUTH0_* vars this needs');
  }
  return createManagementClient({
    issuerDomain,
    tenantDomain,
    clientId,
    clientSecret: readM2mSecret(),
  });
}

type IdentityRow = { client_id: string; subject: string; email: string };

const ORPHAN_HINT =
  'If the identity row is already gone and a clients row is not, find it with:\n' +
  '  SELECT c.id FROM clients c LEFT JOIN client_identities i ON i.client_id = c.id\n' +
  '   WHERE i.client_id IS NULL\n' +
  'then pass --client-id';

/** By the two things the operator can read off the Auth0 dashboard. */
function findByIdentity(where: string, remote: boolean): Target {
  const rows = d1(
    `SELECT client_id, subject, email FROM client_identities WHERE ${where}`,
    remote,
  ) as IdentityRow[];
  if (rows.length === 0) fail(`no identity row matched. ${ORPHAN_HINT}`);
  if (rows.length > 1) fail(`${rows.length} identity rows matched; pass --client-id instead`);
  const row = rows[0];
  return { clientId: row.client_id, subject: row.subject, email: row.email };
}

/**
 * By internal id, which is the only handle an orphan has. The identity row may
 * or may not exist; a missing one is the orphan case rather than an error.
 */
function findByClientId(clientId: string, remote: boolean): Target {
  const rows = d1(
    `SELECT client_id, subject, email FROM client_identities WHERE client_id = ${quote(clientId)}`,
    remote,
  ) as IdentityRow[];
  return { clientId, subject: rows[0]?.subject ?? null, email: rows[0]?.email ?? null };
}

function findTarget(argv: string[], remote: boolean): Target {
  const email = flag(argv, 'email');
  if (email) return findByIdentity(`email = ${quote(email)}`, remote);

  const subject = flag(argv, 'subject');
  if (subject) return findByIdentity(`subject = ${quote(subject)}`, remote);

  const clientId = flag(argv, 'client-id');
  if (clientId) return findByClientId(clientId, remote);

  return fail('pass one of --email, --subject or --client-id');
}

/**
 * The refusal. An orphan has no subject and therefore nothing to resurrect it,
 * so it is the one case that skips this rather than failing it.
 */
async function assertGoneAtAuth0(target: Target): Promise<void> {
  if (!target.subject) {
    console.log('  auth0:    no identity row, so no subject to check — orphan cleanup');
    return;
  }
  const user = await management().getUser(target.subject);
  if (user) {
    fail(
      `${target.subject} still exists at Auth0 (${user.email}).\n` +
        `Deleting these rows now would not delete the athlete: the next request carrying\n` +
        `their token would provision them again as a new empty account. Delete the user in\n` +
        `Auth0 → User Management → Users first, then re-run this.`,
    );
  }
  console.log(`  auth0:    ${target.subject} is gone — safe to proceed`);
}

function countRows(target: Target, remote: boolean): void {
  const id = quote(target.clientId);
  const rows = d1(
    `SELECT
       (SELECT COUNT(*) FROM weeks WHERE client_id = ${id}) AS weeks,
       (SELECT COUNT(*) FROM plans WHERE client_id = ${id}) AS plans,
       (SELECT COUNT(*) FROM client_profiles WHERE client_id = ${id}) AS profiles,
       (SELECT COUNT(*) FROM client_identities WHERE client_id = ${id}) AS identities,
       (SELECT COUNT(*) FROM clients WHERE id = ${id}) AS clients`,
    remote,
  );
  console.log('  rows:    ', JSON.stringify(rows[0]));
}

/**
 * The same order as `account-deletion.ts`, for the same foreign keys: a week
 * references a plan and an athlete, a plan and a profile reference an athlete,
 * and the athlete row goes last because everything referenced it.
 *
 * The identity row goes first here, as it does there, though it no longer buys
 * what it buys there. In the app that statement is what ends a live session
 * mid-cascade; by the time this script runs the Auth0 user is already gone, so
 * every request from a surviving token is refused at the provider lookup
 * regardless. Kept identical so the two sequences can be read against each other.
 */
function purge(target: Target, remote: boolean): void {
  const id = quote(target.clientId);
  for (const statement of [
    `DELETE FROM client_identities WHERE client_id = ${id}`,
    `DELETE FROM weeks WHERE client_id = ${id}`,
    `DELETE FROM plans WHERE client_id = ${id}`,
    `DELETE FROM client_profiles WHERE client_id = ${id}`,
    `DELETE FROM clients WHERE id = ${id}`,
  ]) {
    d1(statement, remote);
    console.log(`  ran:      ${statement}`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const remote = !argv.includes('--local');
  const confirmed = argv.includes('--confirm');

  const target = findTarget(argv, remote);
  console.log(`\n  target:   ${target.clientId}${target.email ? ` (${target.email})` : ''}`);
  console.log(`  database: ${DB_NAME} ${remote ? '--remote (PRODUCTION)' : '--local'}`);

  await assertGoneAtAuth0(target);
  countRows(target, remote);

  if (!confirmed) {
    console.log('\n  Dry run. Re-run with --confirm to delete.\n');
    return;
  }

  console.log('');
  purge(target, remote);
  console.log('\n  Done.\n');
}

await main();
