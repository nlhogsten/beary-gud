#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./lib/cli_ui.sh
source "$SCRIPT_DIR/lib/cli_ui.sh"
# shellcheck source=./docker/config.sh
source "$SCRIPT_DIR/docker/config.sh"
# shellcheck source=./docker/infra.sh
source "$SCRIPT_DIR/docker/infra.sh"
# shellcheck source=./docker/commands.sh
source "$SCRIPT_DIR/docker/commands.sh"

init_cli_ui
dispatch_command "${1:-}"
