#!/usr/bin/env bash
# Writes .env.local for the LOCAL Supabase stack (well-known local dev keys, never real secrets).
set -euo pipefail
eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|PUBLISHABLE_KEY|SECRET_KEY|MAILPIT_URL)=')"
cat > .env.local <<ENV
NEXT_PUBLIC_SUPABASE_URL=${API_URL}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE_KEY}
SUPABASE_SECRET_KEY=${SECRET_KEY}
NEXT_PUBLIC_SITE_URL=http://localhost:3000
MAILPIT_URL=${MAILPIT_URL}
ENV
echo "Wrote .env.local for local Supabase (${API_URL})"
