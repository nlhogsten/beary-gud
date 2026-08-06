#!/usr/bin/env bash

init_cli_ui() {
  local color_mode="${LOG_COLOR:-auto}"
  local unicode_mode="${LOG_UNICODE:-auto}"
  C_RESET=""; C_BLUE=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_MAGENTA=""
  if [[ "$color_mode" == "always" || ( "$color_mode" == "auto" && -t 1 && "${TERM:-}" != "dumb" && -z "${NO_COLOR:-}" ) ]]; then
    C_RESET=$'\033[0m'; C_BLUE=$'\033[36m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_RED=$'\033[31m'; C_MAGENTA=$'\033[35m'
  fi
  SYM_INFO="*"; SYM_WARN="!"; SYM_ERROR="X"; SYM_STEP=">"
  if [[ "$unicode_mode" != "never" ]]; then
    SYM_INFO="●"; SYM_WARN="▲"; SYM_ERROR="✖"; SYM_STEP="›"
  fi
}

emit_log() {
  local stream="$1" color="$2" token="$3"
  shift 3
  local stamp
  stamp="$(date +"%H:%M:%S")"
  if [[ "$stream" == "stderr" ]]; then
    printf "[%s] %b[%s]%b %s\n" "$stamp" "$color" "$token" "$C_RESET" "$*" >&2
  else
    printf "[%s] %b[%s]%b %s\n" "$stamp" "$color" "$token" "$C_RESET" "$*"
  fi
}

log_info() { emit_log stdout "$C_BLUE" "$SYM_INFO INFO" "$@"; }
log_warn() { emit_log stdout "$C_YELLOW" "$SYM_WARN WARN" "$@"; }
log_error() { emit_log stderr "$C_RED" "$SYM_ERROR ERROR" "$@"; }
log_step() { emit_log stdout "$C_MAGENTA" "$SYM_STEP STEP" "$@"; }
