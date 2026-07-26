#!/usr/bin/env bash
# Resolves the git ref `turbo run <task> --affected` should diff against,
# and writes it to $GITHUB_OUTPUT as `base`.
#
# Turbo can auto-detect this from GitHub Actions env vars, but that
# detection has known failure modes on detached-HEAD checkouts (see
# https://github.com/vercel/turborepo/issues/12650 and #9320), so this repo
# sets TURBO_SCM_BASE explicitly instead of relying on it.
#
# Inputs (env vars, both optional):
#   BASE_SHA   - github.event.pull_request.base.sha (set on pull_request)
#   BEFORE_SHA - github.event.before (set on push)
set -euo pipefail

ZERO_SHA="0000000000000000000000000000000000000000"

if [ -n "${BASE_SHA:-}" ]; then
  # pull_request: diff against the PR's target branch.
  base="$BASE_SHA"
elif [ -n "${BEFORE_SHA:-}" ] && [ "$BEFORE_SHA" != "$ZERO_SHA" ]; then
  # push: diff against the branch tip before this push (e.g. the commit
  # before a merged PR landed on main).
  base="$BEFORE_SHA"
else
  # First push to a new branch, or a force-push with no prior tip to
  # compare against: fall back to the immediate parent commit rather than
  # letting turbo assume every package changed.
  base="HEAD~1"
fi

echo "Resolved turbo affected base: $base"
echo "base=$base" >> "$GITHUB_OUTPUT"
