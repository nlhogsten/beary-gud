#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./lib/cli_ui.sh
source "$SCRIPT_DIR/lib/cli_ui.sh"
init_cli_ui

case "${1:-}" in
  init)
    if [[ -f "$ROOT_DIR/.env.local" ]]; then
      log_info ".env.local already exists; no changes made."
    else
      cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env.local"
      log_info "Created .env.local from .env.example."
    fi
    ;;
  *)
    printf "Usage: ./scripts/env-local.sh init\n"
    exit 1
    ;;
esac
