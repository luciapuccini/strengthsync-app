#!/usr/bin/env bash
# HACK: explicit turbo base until vercel/turborepo#12650 fixes detached-HEAD detection
set -euo pipefail

ZERO_SHA="0000000000000000000000000000000000000000"

if [ -n "${BASE_SHA:-}" ]; then
  base="$BASE_SHA"
elif [ -n "${BEFORE_SHA:-}" ] && [ "$BEFORE_SHA" != "$ZERO_SHA" ]; then
  base="$BEFORE_SHA"
else
  base="HEAD~1"
fi

echo "Resolved turbo affected base: $base"
echo "base=$base" >> "$GITHUB_OUTPUT"
