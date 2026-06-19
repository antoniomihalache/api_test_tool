#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RUNTIME_DIR="$ROOT_DIR/.runtime"
mkdir -p "$RUNTIME_DIR"

detect_pkg_manager() {
  if command -v apt-get >/dev/null 2>&1; then echo "apt"; return; fi
  if command -v dnf >/dev/null 2>&1; then echo "dnf"; return; fi
  if command -v yum >/dev/null 2>&1; then echo "yum"; return; fi
  if command -v pacman >/dev/null 2>&1; then echo "pacman"; return; fi
  if command -v zypper >/dev/null 2>&1; then echo "zypper"; return; fi
  if command -v brew >/dev/null 2>&1; then echo "brew"; return; fi
  echo "unknown"
}

run_install() {
  local pm="$1"
  shift
  local pkgs=("$@")

  case "$pm" in
    apt)
      sudo apt-get update -y
      sudo apt-get install -y "${pkgs[@]}"
      ;;
    dnf)
      sudo dnf install -y "${pkgs[@]}"
      ;;
    yum)
      sudo yum install -y "${pkgs[@]}"
      ;;
    pacman)
      sudo pacman -Sy --noconfirm "${pkgs[@]}"
      ;;
    zypper)
      sudo zypper --non-interactive install "${pkgs[@]}"
      ;;
    brew)
      brew install "${pkgs[@]}"
      ;;
    *)
      fail "No supported package manager found. Install dependencies manually."
      ;;
  esac
}

install_if_missing() {
  local binary="$1"
  local label="$2"
  local pm="$3"
  shift 3
  local pkgs=("$@")

  if command -v "$binary" >/dev/null 2>&1; then
    info "$label already installed"
    return
  fi

  info "$label not found. Installing..."
  run_install "$pm" "${pkgs[@]}"

  if ! command -v "$binary" >/dev/null 2>&1; then
    fail "$label installation did not provide '$binary'. Please install it manually."
  fi
}

install_optional_if_missing() {
  local binary="$1"
  local label="$2"
  local pm="$3"
  shift 3
  local pkgs=("$@")

  if command -v "$binary" >/dev/null 2>&1; then
    info "$label already installed"
    return
  fi

  warn "$label not found. Attempting install (optional)..."
  if ! run_install "$pm" "${pkgs[@]}"; then
    warn "Could not install $label automatically. Continuing without it."
    return
  fi

  if ! command -v "$binary" >/dev/null 2>&1; then
    warn "$label still not available. Continuing without it."
  fi
}

ensure_docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    info "Docker Compose plugin available"
    return
  fi

  local pm="$1"
  info "Docker Compose plugin not found. Installing..."

  case "$pm" in
    apt) run_install "$pm" docker-compose-plugin ;;
    dnf|yum) run_install "$pm" docker-compose-plugin ;;
    pacman) run_install "$pm" docker-compose ;;
    zypper) run_install "$pm" docker-compose ;;
    brew) run_install "$pm" docker-compose ;;
    *) fail "Could not install Docker Compose plugin automatically." ;;
  esac

  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is still unavailable."
}

ensure_docker_service() {
  if docker info >/dev/null 2>&1; then
    info "Docker daemon is running"
    return
  fi

  warn "Docker daemon is not running. Trying to start it with systemctl..."
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl enable --now docker || true
  fi

  docker info >/dev/null 2>&1 || fail "Docker daemon is not available. Start Docker and rerun this script."
}

wait_for_mongo() {
  if [[ "${USE_EXTERNAL_MONGO:-0}" == "1" ]]; then
    info "Waiting for external MongoDB availability at $EFFECTIVE_MONGO_URI..."
    for i in $(seq 1 40); do
      if command -v mongosh >/dev/null 2>&1 && mongosh "$EFFECTIVE_MONGO_URI" --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        info "External MongoDB is reachable"
        return
      fi
      sleep 2
    done
    fail "External MongoDB is not reachable at $EFFECTIVE_MONGO_URI"
  fi

  info "Waiting for MongoDB container health..."
  for i in $(seq 1 40); do
    if docker compose exec -T mongo mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
      info "MongoDB is healthy"
      return
    fi
    sleep 2
  done
  fail "MongoDB container did not become healthy in time"
}

cleanup() {
  local code=$?
  if [[ -f "$RUNTIME_DIR/backend.pid" ]]; then
    kill "$(cat "$RUNTIME_DIR/backend.pid")" >/dev/null 2>&1 || true
    rm -f "$RUNTIME_DIR/backend.pid"
  fi
  if [[ -f "$RUNTIME_DIR/frontend.pid" ]]; then
    kill "$(cat "$RUNTIME_DIR/frontend.pid")" >/dev/null 2>&1 || true
    rm -f "$RUNTIME_DIR/frontend.pid"
  fi

  if [[ $code -ne 0 ]]; then
    warn "Bootstrap exited with errors."
  fi
}

trap cleanup EXIT INT TERM

normalize_mongo_uri_for_host() {
  local uri="$1"
  if [[ "$uri" == mongodb://mongo:* ]]; then
    echo "${uri/mongodb:\/\/mongo:/mongodb://localhost:}"
    return
  fi
  if [[ "$uri" == mongodb://mongo/* ]]; then
    echo "${uri/mongodb:\/\/mongo\//mongodb://localhost/}"
    return
  fi
  echo "$uri"
}

PM="$(detect_pkg_manager)"
info "Detected package manager: $PM"

case "$PM" in
  apt)
    install_if_missing docker "Docker" "$PM" docker.io
    install_if_missing node "Node.js" "$PM" nodejs
    install_if_missing npm "npm" "$PM" npm
    install_optional_if_missing mongosh "Mongo Shell" "$PM" mongodb-mongosh
    ;;
  dnf)
    install_if_missing docker "Docker" "$PM" docker
    install_if_missing node "Node.js" "$PM" nodejs
    install_if_missing npm "npm" "$PM" npm
    install_optional_if_missing mongosh "Mongo Shell" "$PM" mongodb-mongosh
    ;;
  yum)
    install_if_missing docker "Docker" "$PM" docker
    install_if_missing node "Node.js" "$PM" nodejs
    install_if_missing npm "npm" "$PM" npm
    install_optional_if_missing mongosh "Mongo Shell" "$PM" mongodb-mongosh
    ;;
  pacman)
    install_if_missing docker "Docker" "$PM" docker
    install_if_missing node "Node.js" "$PM" nodejs
    install_if_missing npm "npm" "$PM" npm
    install_optional_if_missing mongosh "Mongo Shell" "$PM" mongodb-shell
    ;;
  zypper)
    install_if_missing docker "Docker" "$PM" docker
    install_if_missing node "Node.js" "$PM" nodejs
    install_if_missing npm "npm" "$PM" npm
    install_optional_if_missing mongosh "Mongo Shell" "$PM" mongodb-mongosh
    ;;
  brew)
    install_if_missing docker "Docker" "$PM" docker
    install_if_missing node "Node.js" "$PM" node
    install_if_missing npm "npm" "$PM" npm
    install_optional_if_missing mongosh "Mongo Shell" "$PM" mongosh
    ;;
  *)
    fail "Unsupported package manager. Install Docker, Docker Compose, Node.js, and npm manually."
    ;;
esac

ensure_docker_service
ensure_docker_compose "$PM"

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  warn "Created .env from .env.example"
fi

# Load environment values from .env so bootstrap checks use the same runtime config.
# Convert CRLF to LF if needed (handles Windows line endings from git clone with core.autocrlf=true).
sed -i 's/\r$//' "$ROOT_DIR/.env" 2>/dev/null || true

set -a
source "$ROOT_DIR/.env"
set +a

MONGO_URI="${MONGODB_URI:-mongodb://localhost:27017/perf_platform}"
EFFECTIVE_MONGO_URI="$(normalize_mongo_uri_for_host "$MONGO_URI")"
USE_EXTERNAL_MONGO=0

mkdir -p /tmp/k6-scripts

cd "$ROOT_DIR"

info "Starting infra containers (mongo, prometheus, grafana)..."
if ! docker compose up -d mongo prometheus grafana; then
  warn "Could not start MongoDB container (likely port 27017 already in use)."
  warn "Falling back to external/local MongoDB at $EFFECTIVE_MONGO_URI"
  docker compose up -d prometheus grafana
  USE_EXTERNAL_MONGO=1
fi

info "Using MongoDB URI for local backend/seed: $EFFECTIVE_MONGO_URI"

info "Ensuring k6 image is present..."
docker pull grafana/k6:0.54.0 >/dev/null

wait_for_mongo

info "Installing backend dependencies..."
(cd "$ROOT_DIR/backend" && npm install)

info "Installing frontend dependencies..."
(cd "$ROOT_DIR/frontend" && npm install)

info "Seeding database with default user only..."
(cd "$ROOT_DIR/backend" && MONGODB_URI="$EFFECTIVE_MONGO_URI" npm run seed:user)

info "Starting backend and frontend in dev mode..."
(cd "$ROOT_DIR/backend" && MONGODB_URI="$EFFECTIVE_MONGO_URI" npm run dev > "$RUNTIME_DIR/backend.log" 2>&1 & echo $! > "$RUNTIME_DIR/backend.pid")
(cd "$ROOT_DIR/frontend" && npm run dev -- --host 0.0.0.0 --port 5173 > "$RUNTIME_DIR/frontend.log" 2>&1 & echo $! > "$RUNTIME_DIR/frontend.pid")

info "All services are up."
echo ""
echo "Frontend:   http://localhost:5173"
echo "Backend:    http://localhost:4000"
echo "Grafana:    http://localhost:3001 (admin/admin)"
echo "Prometheus: http://localhost:9090"
echo ""
echo "Default login: admin@perf-platform.local / Admin1234!"
echo ""
echo "Logs:"
echo "  Backend  -> $RUNTIME_DIR/backend.log"
echo "  Frontend -> $RUNTIME_DIR/frontend.log"
echo ""
echo "Press Ctrl+C to stop backend/frontend."

tail -f "$RUNTIME_DIR/backend.log" "$RUNTIME_DIR/frontend.log"
