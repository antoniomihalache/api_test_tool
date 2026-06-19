#!/usr/bin/env bash
# setup.sh – Bootstrap the perf-platform on a fresh machine
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Require Docker ───────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "Docker is required. Install from https://docs.docker.com/get-docker/"
command -v docker-compose >/dev/null 2>&1 || \
  docker compose version >/dev/null 2>&1 || \
  error "Docker Compose is required."

info "Docker found: $(docker --version)"

# ── Create .env if missing ───────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  warn ".env created from .env.example — review and update JWT_SECRET before production use"
fi

# ── Create required directories ──────────────────────────────
mkdir -p /tmp/k6-scripts
info "k6 scripts directory ready: /tmp/k6-scripts"

# ── Pull images ──────────────────────────────────────────────
info "Pulling Docker images…"
docker pull grafana/k6:0.54.0 &>/dev/null && info "k6 image ready"

# ── Start services ───────────────────────────────────────────
info "Starting platform services…"
cd "$ROOT_DIR"
docker compose up -d --build

# ── Wait for MongoDB ─────────────────────────────────────────
info "Waiting for MongoDB to be healthy…"
for i in $(seq 1 30); do
  if docker compose exec -T mongo mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
    info "MongoDB is up"
    break
  fi
  if [ "$i" -eq 30 ]; then
    error "MongoDB did not become healthy in time"
  fi
  sleep 2
done

# ── Seed database ────────────────────────────────────────────
info "Seeding demo data…"
docker compose exec -T backend npm run seed && info "Seed complete" || warn "Seed failed (may be first run issue)"

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ Platform is ready!${NC}"
echo ""
echo "  Dashboard  → http://localhost:3000"
echo "  Backend    → http://localhost:4000"
echo "  Grafana    → http://localhost:3001  (admin / admin)"
echo "  Prometheus → http://localhost:9090"
echo ""
echo "  Default login: admin@perf-platform.local / Admin1234!"
echo ""
