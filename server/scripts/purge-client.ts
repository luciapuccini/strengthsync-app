import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createManagementClient, type ManagementClient } from '../src/lib/management.ts';

type Target = {
  clientId: string;
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

function stripJsoncComments(raw: string): string {
  const keepStrings = (match: string): string => (match.startsWith('"') ? match : '');
  return raw
    .replace(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, keepStrings)
    .replace(/"(?:\\.|[^"\\])*"|,(?=\s*[}\]])/g, keepStrings);
}

function readWranglerVars(): Record<string, string> {
  const raw = readFileSync(resolve(SERVER_ROOT, 'wrangler.jsonc'), 'utf8');
  const config = JSON.parse(stripJsoncComments(raw)) as { vars?: Record<string, string> };
  return config.vars ?? {};
}

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
