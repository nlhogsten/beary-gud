#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$DB_DIR/../.." && pwd)"

# shellcheck source=../../../scripts/lib/cli_ui.sh
source "$ROOT_DIR/scripts/lib/cli_ui.sh"
init_cli_ui

resolve_cli() {
  local workspace_cli="$DB_DIR/node_modules/.bin/supabase"
  local root_cli="$ROOT_DIR/node_modules/.bin/supabase"
  if [[ -x "$workspace_cli" ]]; then printf "%s\n" "$workspace_cli"; return; fi
  if [[ -x "$root_cli" ]]; then printf "%s\n" "$root_cli"; return; fi
  log_error "Supabase CLI not found. Run 'bun install'."
  exit 1
}

run_cli() {
  local cli
  cli="$(resolve_cli)"
  "$cli" --workdir "$DB_DIR" "$@"
}

case "${1:-}" in
  start) run_cli start ;;
  stop) run_cli stop ;;
  status) run_cli status ;;
  *)
    printf "Usage: ./infra/db/scripts/supabase.sh <start|stop|status>\n"
    exit 1
    ;;
esac
