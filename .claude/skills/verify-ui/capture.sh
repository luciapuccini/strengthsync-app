#!/usr/bin/env bash
# Capture an Orca browser screenshot as a real PNG file.
# `orca screenshot` only emits base64 inside JSON, so it needs decoding
# before the image can be read.
#
# Usage: capture.sh <output.png> [extra orca args, e.g. --page <id>]
set -euo pipefail

out="${1:?usage: capture.sh <output.png> [extra orca args]}"
shift

orca screenshot --format png --json "$@" | python3 -c '
import base64, json, pathlib, sys

payload = json.load(sys.stdin)
if not payload.get("ok"):
    sys.exit(f"orca screenshot failed: {payload}")
pathlib.Path(sys.argv[1]).write_bytes(base64.b64decode(payload["result"]["data"]))
' "$out"

echo "$out"
