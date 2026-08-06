#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$DB_DIR/../.." && pwd)"
ROOT_ENV_FILE="$ROOT_DIR/.env.local"
DEFAULT_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:56422/postgres"

# shellcheck source=../../../scripts/lib/cli_ui.sh
source "$ROOT_DIR/scripts/lib/cli_ui.sh"
init_cli_ui

if [[ -f "$ROOT_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT_ENV_FILE"
  set +a
fi

DATABASE_URL="${DATABASE_URL:-$DEFAULT_DATABASE_URL}"
if [[ "$DATABASE_URL" != *"@127.0.0.1:"* && "$DATABASE_URL" != *"@localhost:"* ]]; then
  log_error "Refusing to reset a non-local database: $DATABASE_URL"
  exit 1
fi

if [[ "${1:-}" != "--yes" ]]; then
  if [[ ! -t 0 ]]; then
    log_error "Confirmation required. Re-run with --yes in a non-interactive shell."
    exit 1
  fi
  log_warn "This deletes all local VOXL database data."
  read -r -p "Continue? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || exit 0
fi

"$SCRIPT_DIR/supabase.sh" start
SUPABASE_CLI="$DB_DIR/node_modules/.bin/supabase"
[[ -x "$SUPABASE_CLI" ]] || SUPABASE_CLI="$ROOT_DIR/node_modules/.bin/supabase"
"$SUPABASE_CLI" --workdir "$DB_DIR" db reset --local --no-seed --yes
(cd "$DB_DIR" && DATABASE_URL="$DATABASE_URL" bun run db:migrate)
log_info "Local VOXL database reset complete."
