# API Performance Testing Platform

Production-grade internal API performance testing platform built with k6, React, Node.js, and MongoDB.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Load Generation Host (External)             │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Frontend   │    │   Backend    │    │  Execution Mgr   │  │
│  │  React+Vite  │◄──►│  Express+TS  │◄──►│  Docker k6 Runner│  │
│  │  :3000       │    │  :4000       │    │                  │  │
│  └──────────────┘    └──────┬───────┘    └────────┬─────────┘  │
│                             │                     │            │
│  ┌──────────────┐    ┌──────▼───────┐             │            │
│  │   Grafana    │    │   MongoDB    │             │            │
│  │  :3001       │    │  :27017      │             │            │
│  └──────┬───────┘    └──────────────┘             │            │
│         │                                         │            │
│  ┌──────▼───────┐                                 │            │
│  │  Prometheus  │                                 │            │
│  │  :9090       │                                 │            │
│  └──────────────┘                                 │            │
└───────────────────────────────────────────────────┼────────────┘
                                                    │ HTTP (Ingress)
                                          ┌─────────▼──────────┐
                                          │   k3s VM (Target)  │
                                          │   8 CPU / 16GB RAM │
                                          │                    │
                                          │  ┌──────────────┐  │
                                          │  │ Target APIs  │  │
                                          │  │ (k3s pods)   │  │
                                          │  └──────────────┘  │
                                          └────────────────────┘
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | Node.js 20, Express 5, TypeScript |
| Database | MongoDB 7 |
| Load Engine | k6 (Docker-based) |
| Metrics | Prometheus + Grafana |
| Infrastructure | Docker Compose |
| Future | Kubernetes Jobs (k3s) |

## Quick Start

### Recommended: One-Command Bootstrap

Use the bootstrap script to check prerequisites, install missing dependencies when possible, start observability services, seed only the default app user, install frontend/backend dependencies, and run both apps.

```bash
npm run bootstrap
```

What it does:

- Checks Docker, Docker Compose plugin, Node.js, npm
- Starts Docker daemon if needed
- Starts `mongo`/`prometheus`/`grafana` (falls back to external Mongo if port `27017` is already in use)
- Pulls `grafana/k6:0.54.0`
- Installs dependencies in `backend` and `frontend`
- Seeds database with default app user only (no demo scenarios/services/flows)
- Starts backend and frontend dev servers

### App Access After Bootstrap

| Service | URL | Notes |
|---------|-----|-------|
| Frontend App | http://localhost:5173 | Main UI |
| Backend API | http://localhost:4000 | REST API |
| Grafana | http://localhost:3001 | `admin / admin` |
| Prometheus | http://localhost:9090 | Metrics store/query |

### Default App Login Created By Bootstrap

| Field | Value |
|-------|-------|
| Email | `admin@perf-platform.local` |
| Password | `Admin1234!` |

You can override these using environment variables before running bootstrap:

- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`

### Prerequisites
- Docker ≥ 24
- Docker Compose ≥ 2.20
- Node.js ≥ 20 (for local dev)

### 1. Clone & Configure

```bash
git clone <repo-url> api_test_tool
cd api_test_tool
cp .env.example .env
# Edit .env with your target service URLs
```

If you are not using bootstrap, make sure `.env` also includes a valid `JWT_SECRET` and `MONGODB_URI`.

### 2. Start Platform

```bash
# Production mode
docker compose up -d

# Development mode (hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### 3. Access

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Grafana | http://localhost:3001 (admin/admin) |
| Prometheus | http://localhost:9090 |

### 4. Seed Demo Data

```bash
cd backend && npm run seed
```

If you only want the default user (no demo data), run:

```bash
cd backend && npm run seed:user
```

## Grafana Dashboards (Provisioned By Default)

Grafana auto-loads dashboards from `monitoring/grafana/dashboards` using file provisioning.

Provisioned dashboards:

- `k6 Performance Platform` (`k6-dashboard.json`)
- `k6 Endpoint Breakdown` (`k6-endpoint-dashboard.json`)

The second dashboard includes:

- Request volume by request name
- Status code mix by request name
- p95 and p99 by request name
- Error rate by request name
- Failing checks
- Failed requests by HTTP status
- Failed requests by `error_code`
- Expected vs unexpected responses
- Latency component breakdown (`waiting`, `tls`, `sending`, `receiving`)

If dashboards are not visible:

1. Verify Grafana is running: `docker compose ps grafana`.
2. Restart Grafana: `docker compose restart grafana`.
3. Check provisioning path is mounted:
    - `/etc/grafana/provisioning`
    - `/var/lib/grafana/dashboards`
4. Check Grafana logs: `docker compose logs grafana`.

## Development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev

# Run a quick performance check
npm run perf
```

## Project Structure

```
api_test_tool/
├── backend/              # Express API server
│   └── src/
│       ├── modules/      # Feature modules (services, scenarios, executions…)
│       ├── generator/    # Dynamic k6 script generator
│       ├── runner/       # Docker + Kubernetes execution engines
│       └── database/     # MongoDB connection
├── frontend/             # React dashboard
│   └── src/
│       ├── pages/        # Page-level components
│       ├── components/   # Shared UI components
│       └── api/          # Backend API clients
├── k6/                   # k6 base scripts and Dockerfile
├── monitoring/           # Prometheus + Grafana config
├── scripts/              # Setup and seed utilities
└── docker-compose.yml    # Full stack orchestration
```

## Execution Modes

### External Runner (Default)
k6 runs inside a Docker container on the load generation host. Traffic crosses the network boundary into the k3s VM via Ingress, ensuring zero resource contention with the application under test.

### Kubernetes Runner (Future)
The backend can generate a `Job` manifest and apply it to the k3s cluster. Enable via `RUNNER_MODE=kubernetes` in `.env`.

## Test Types

| Type | VUs | Duration | Purpose |
|------|-----|----------|---------|
| Smoke | 1–2 | 1–2 min | Sanity check |
| Load | Target | 5–30 min | Normal load |
| Stress | 2–3× target | 10–30 min | Find breaking point |
| Spike | Sudden surge | Short | Resilience |
| Soak | Normal | Hours | Memory leaks |

## Understanding VUs And Test-Type Impact

### What Virtual Users (VUs) Mean

- A Virtual User (VU) is one concurrent simulated user executing your scenario loop.
- With 10 VUs, up to 10 users run requests in parallel.
- VUs represent concurrency, not total unique users over a full day.

As VUs increase, you should generally expect:

- Higher throughput (requests/s)
- More queueing and contention in the target system
- Higher tail latency (p95, p99)
- More errors once limits are reached (timeouts, 4xx/5xx, threshold failures)

### How Each Test Type Influences Results

- Smoke:
    - Very low traffic for a short time.
    - Best for sanity checks (auth, routing, basic correctness).
    - Not suitable for capacity conclusions.
- Load:
    - Steady traffic near expected production level.
    - Best for baseline performance and SLA/SLO validation.
    - Focus on stable p95/p99, error rate, and requests/s.
- Stress:
    - Traffic ramps above normal until degradation appears.
    - Best for discovering system limits and failure behavior.
    - Look for latency inflection points and error-rate growth.
- Spike:
    - Sudden short surge to high traffic, then rapid drop.
    - Best for burst handling and recovery validation.
    - Watch max p99 and recovery time after the peak.
- Soak:
    - Moderate constant load over long duration.
    - Best for leak/exhaustion detection (memory, connections, sessions).
    - Analyze trends over time, not just end-of-test averages.

### Interpreting p95 vs p99

- p95 latency means 95% of requests are at or below that value.
- p99 latency means 99% of requests are at or below that value.
- p99 is more sensitive to outliers, so it is usually higher than p95.

Practical interpretation:

- Good p95 with much worse p99: occasional slow tail affecting a small set of users.
- p95 and p99 close together: more consistent latency distribution.

### Recommended Execution Order

1. Run Smoke to validate scenario/auth/header/path correctness.
2. Run Load to establish baseline metrics.
3. Run Stress to find capacity limits.
4. Run Spike to validate burst tolerance and recovery.
5. Run Soak before production sign-off for long-run stability.

## License

Internal use only.

## Deliverables (Ordered)

1. docs/01-repository-structure.md
2. docs/02-architecture-diagram.md
3. docs/03-database-schema.md
4. docs/04-backend-apis.md
5. docs/05-dashboard-ui.md
6. docs/06-k6-generator.md
7. docs/07-external-runner.md
8. docs/08-kubernetes-runner.md
9. docs/09-monitoring.md
10. docs/10-documentation.md
