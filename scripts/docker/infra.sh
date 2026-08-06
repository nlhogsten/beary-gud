compose() {
  (cd "$ROOT_DIR" && docker compose -f "$COMPOSE_FILE" "$@")
}

ensure_env() {
  if [[ ! -f "$ROOT_ENV_FILE" ]]; then
    log_step "Creating local environment file"
    "$ROOT_DIR/scripts/env-local.sh" init
  fi
}

supabase() {
  "$SUPABASE_SCRIPT" "$@"
}
