stack_up() {
  ensure_env
  log_step "Starting local PostgreSQL/Supabase services"
  supabase start
  log_step "Building and starting VOXL application containers"
  compose up --build -d
  stack_ps
}

stack_down() {
  log_step "Stopping VOXL application containers"
  compose down
  log_step "Stopping local PostgreSQL/Supabase services"
  supabase stop
}

stack_ps() {
  log_step "VOXL application containers"
  compose ps
  log_step "VOXL local database services"
  supabase status || true
}

usage() {
  cat <<'USAGE'
Usage: ./scripts/docker.sh <command>

Commands:
  stack:up       Start Supabase, server, and studio
  stack:down     Stop the entire local stack
  stack:restart  Restart the entire local stack
  stack:ps       Show application and database status
  stack:logs     Follow server and studio logs
  apps:build     Build the server and studio images
  server:logs    Follow server logs
  studio:logs    Follow studio logs
USAGE
}

dispatch_command() {
  case "${1:-}" in
    stack:up) stack_up ;;
    stack:down) stack_down ;;
    stack:restart) stack_down; stack_up ;;
    stack:ps) stack_ps ;;
    stack:logs) compose logs -f server studio ;;
    apps:build) compose build server studio ;;
    server:logs) compose logs -f server ;;
    studio:logs) compose logs -f studio ;;
    *) usage; exit 1 ;;
  esac
}
