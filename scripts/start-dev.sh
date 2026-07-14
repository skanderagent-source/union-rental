#!/usr/bin/env bash
# One-command local setup + dev servers for Union Rental.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf '▸ %s\n' "$*"; }
warn() { printf '⚠ %s\n' "$*" >&2; }
die() { printf '✗ %s\n' "$*" >&2; exit 1; }

BACKEND_PID=""
FRONTEND_PID=""

ensure_node() {
  if ! command -v node >/dev/null 2>&1; then
    die "Node.js not found. Install Node 22+ (see .nvmrc) or run: nvm install"
  fi

  local required major
  required=$(tr -d '[:space:]' < .nvmrc 2>/dev/null || echo "22")
  major=$(node -p "process.versions.node.split('.')[0]")

  if (( major < required )); then
    if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
      # shellcheck disable=SC1090
      source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
      nvm install "$required" >/dev/null
      nvm use "$required" >/dev/null
      log "Using Node $(node -v) via nvm"
    else
      warn "Node $(node -v) is older than v${required}. Install Node ${required}+ to avoid issues."
    fi
  fi
}

ensure_env_file() {
  local example="$1"
  local target="$2"

  if [[ -f "$target" ]]; then
    return 0
  fi

  if [[ ! -f "$example" ]]; then
    die "Missing $example"
  fi

  cp "$example" "$target"
  log "Created $target from example"
}

port_listener_pids() {
  local port="$1"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti ":${port}" -sTCP:LISTEN 2>/dev/null || true)
  fi

  if [[ -z "$pids" ]] && command -v ss >/dev/null 2>&1; then
    pids=$(ss -tlnp "sport = :${port}" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u | tr '\n' ' ' || true)
  fi

  printf '%s' "$pids"
}

free_dev_port() {
  local port="$1"
  local pids
  pids=$(port_listener_pids "$port")

  if [[ -z "$pids" ]]; then
    return 0
  fi

  log "Stopping stale process on port ${port}..."
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 0.5

  pids=$(port_listener_pids "$port")
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 0.5
  fi

  if command -v fuser >/dev/null 2>&1 && port_listener_pids "$port" | grep -q .; then
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 0.5
  fi
}

wait_for_backend() {
  local url="$1"
  local attempts=30
  local i

  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS --max-time 1 "$url" >/dev/null 2>&1; then
      return 0
    fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      die "Backend exited before becoming healthy. Check apps/backend/.env and port 4001."
    fi
    sleep 0.5
  done

  die "Backend did not respond on $url. A stale process may still own port 4001."
}

ensure_legacy_assets() {
  local assets_dir="apps/frontend/src/assets"

  if [[ ! -d "$assets_dir" ]] || [[ -z "$(ls -A "$assets_dir" 2>/dev/null)" ]]; then
    log "Extracting legacy assets..."
    npm run extract-legacy-assets
  fi

  if [[ ! -f "apps/frontend/src/styles/theme.css" ]] && [[ -f "legacy/index.html" ]]; then
    log "Extracting legacy CSS..."
    npm run extract-legacy-css
  fi
}

cleanup() {
  local code=$?
  trap - SIGINT SIGTERM EXIT

  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi

  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi

  exit "$code"
}

log "Union Rental — local dev bootstrap"
ensure_node

log "Installing dependencies..."
npm install

ensure_env_file "apps/backend/.env.example" "apps/backend/.env"
ensure_env_file "apps/frontend/.env.example" "apps/frontend/.env"

ensure_legacy_assets

log "Verifying environment..."
if ! npm run verify-env; then
  die "Environment check failed. Edit apps/backend/.env and apps/frontend/.env, then re-run."
fi

free_dev_port 4001
free_dev_port 5174

log "Starting backend (http://localhost:4001) and frontend (http://localhost:5174)..."
log "Press Ctrl+C to stop both servers."
echo

trap cleanup SIGINT SIGTERM EXIT

npm run dev:backend &
BACKEND_PID=$!

wait_for_backend "http://localhost:4001/health"

npm run dev:frontend &
FRONTEND_PID=$!

wait -n "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || wait
