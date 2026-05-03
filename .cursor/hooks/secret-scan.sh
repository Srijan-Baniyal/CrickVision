#!/bin/bash
# Secret-scan hook for cricket-vision-analytics.
# Reads the prompt the user is about to submit on stdin (JSON) and warns
# (permission: "ask") if it looks like an API key was pasted in. Fails open
# on any error so the user is never blocked by a broken hook.

set -uo pipefail

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // .input // empty' 2>/dev/null)

if [ -z "$prompt" ]; then
  echo '{}'
  exit 0
fi

# Patterns for common provider keys we'll touch in this project plus a few
# generic AWS/GCP shapes. Tuned to be specific enough to avoid false positives
# in normal prose. Keep this list short and high-signal — adjust if a pattern
# fires on legitimate content.
patterns=(
  'sk-[A-Za-z0-9_-]{20,}'              # OpenAI / Anthropic-style
  'sk-ant-[A-Za-z0-9_-]{20,}'          # Anthropic explicit
  'AIza[0-9A-Za-z_-]{35}'              # Google API keys (Gemini)
  'pcsk_[A-Za-z0-9_-]{20,}'            # Pinecone
  'rnd_[A-Za-z0-9_-]{20,}'             # Render
  'vercel_blob_rw_[A-Za-z0-9_-]{20,}'  # Vercel Blob RW
  'AKIA[0-9A-Z]{16}'                   # AWS access key id
  'ghp_[A-Za-z0-9]{36,}'               # GitHub PAT
  'xox[baprs]-[A-Za-z0-9-]{10,}'       # Slack tokens
  'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}' # JWT
)

matched=""
for pattern in "${patterns[@]}"; do
  if printf '%s' "$prompt" | rg --quiet --pcre2 "$pattern"; then
    matched="$pattern"
    break
  fi
done

if [ -n "$matched" ]; then
  jq -n --arg pat "$matched" '{
    permission: "ask",
    user_message: ("Possible API key detected in your prompt (matched: " + $pat + "). Send anyway?"),
    agent_message: "User was warned that the prompt may contain a secret. If they confirm, proceed but never echo the secret back."
  }'
  exit 0
fi

echo '{}'
exit 0
