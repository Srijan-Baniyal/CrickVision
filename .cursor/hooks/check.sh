#!/bin/bash
# Stop hook for cricket-vision-analytics. Runs `bun run check` (Ultracite/Biome)
# when the agent finishes its turn. If checks fail, returns a follow-up message
# so the agent fixes the issues before truly stopping. Bounded by loop_limit
# in hooks.json so it can't loop forever.

set -uo pipefail

cd "$(dirname "$0")/../.." || exit 0

# Skip the check entirely if the workspace has no source files yet (fresh
# clone / no edits this turn) — saves a few seconds on conversational turns.
if ! ls app/*.tsx 2>/dev/null | head -n 1 > /dev/null; then
  echo '{}'
  exit 0
fi

# Capture both stdout and stderr; cap output to keep the follow-up message
# small (Biome can be verbose). Capture exit status BEFORE any pipe/||,
# otherwise $? is from the assignment (always 0).
set +e
output=$(bun run check 2>&1)
status=$?
set -e

if [ $status -eq 0 ]; then
  echo '{}'
  exit 0
fi

truncated=$(printf '%s' "$output" | tail -n 80)

jq -n --arg out "$truncated" '{
  followup_message: ("`bun run check` failed before stopping. Fix these and the hook will re-run:\n\n```\n" + $out + "\n```")
}'
exit 0
