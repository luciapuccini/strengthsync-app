# Deleting an athlete

Two different deletions, one of which is not automated at all.

## The athlete's own, from inside the app

`DELETE /api/account`, reached from `/account`. It deletes the Auth0 user, then
the `client_identities` row, then cascades weeks, plans, profile and the
`clients` row. The ordering and the reasoning behind it are in
`server/src/lib/account-deletion.ts`; the summary is in
[auth.md](../architecture/auth.md#account-deletion). Nothing here is manual, and
this is the path App Store Guideline 5.1.1(v) requires.

## The operator's, from the Auth0 dashboard

Deleting a user in **Auth0 → User Management → Users** does not touch D1, and
this is easy to misread as sufficient. It stops a *new* token being minted, so
the athlete is locked out within the lifetime of whatever token they are already
holding — but every row they wrote stays in D1, unreachable and uncounted.

The rows are unreachable rather than dangerous: every request arrives as a
subject, and that subject now maps to nothing. So this is untidy, not a leak.
It is still data that was supposed to go.

**Clean it up with `purge:client`**, which is the second half of that deletion:

```bash
# dry run — always do this first; it prints what would go
pnpm --filter @strengthsync/server purge:client -- --email athlete@example.com

# and then, having read it
pnpm --filter @strengthsync/server purge:client -- --email athlete@example.com --confirm
```

`--local` targets the local D1, which is where it is worth rehearsing. Without
it the script talks to production, and says so in its output.

**It refuses to run if the Auth0 user still exists.** That refusal is the whole
reason it is a script and not a `wrangler d1 execute` in a runbook. Provisioning
in `resolveClientId` is unconditional, so deleting these rows while Auth0 still
has the user does not delete the athlete — their next request recreates them as
a new empty account, and the deletion reverses itself into something that looks
like the app erased their training and left them signed in. Delete at Auth0
first, always.

It reads the tenant values from `wrangler.jsonc` and the M2M secret from
`AUTH0_M2M_CLIENT_SECRET` or `server/.dev.vars`. `read:users` is the only scope
it needs beyond D1 access.

## Orphaned rows

Two things leave a `clients` row with no identity pointing at it: a cascade that
died part-way (there is no transaction across Auth0 and D1, or across D1's own
statements), and the loser of a provisioning race whose `deleteUnboundClient`
never ran. Find them with:

```sql
SELECT c.id, c.display_name, c.created_at
FROM clients c
LEFT JOIN client_identities i ON i.client_id = c.id
WHERE i.client_id IS NULL;
```

Pass `--client-id` to purge one. There is no subject to check at Auth0 in this
case, and nothing that could resurrect it, so the script says so and proceeds.

## When to run this

**On demand, not on a schedule.** There is no cron and there will not be one
before the MVP ships. At twenty athletes the trigger is an actual deletion — the
operator deletes at Auth0, then runs the script — and the orphan query above is
worth running once at the end of the beta rather than periodically.

The version that is correct under partial failure is a marker write plus a Cron
Trigger that retries both halves: a new status, a `scheduled` handler and a purge
job. That is deliberately not built, and is recorded in
[future_state_after_mvp/todos.md](../future_state_after_mvp/todos.md).

## Known gap

`scripts/` is outside `server/tsconfig.json`'s `include`, so this script is
linted by pre-commit but **not** typechecked — the same as `gen-openapi.ts`. Its
deletion order is a second copy of the one in `account-deletion.ts` and nothing
enforces that they agree; both files carry a comment pointing at the other.
