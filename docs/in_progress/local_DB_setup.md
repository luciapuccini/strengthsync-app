I'm having issues usually related to DB state
lets alert about the initial migration script
seed 1 user + 1 plan + 1 week
also history
maybe we need to define the minimal state of the DB so the apps work => seed should do it

use drizzle kit to consume/edit local DB

Problem
GET /weeks/current 404’d even after demo seed + history looked fine.

Cause
getCurrentWeek requires status = in_flight and today within start_date–end_date. Demo seed hardcodes week 2026-07-20 → 2026-07-26, so once “today” is outside that range (e.g. 2026-08-08), the week exists but current returns null.

Seed limitation
date('now') can fix column dates in SQL. The schedule JSON still has fixed per-day dates, so a static .sql file can’t fully stay “current” without a generator script.

Later work

Make demo seed dates relative to run time (columns + schedule JSON).
