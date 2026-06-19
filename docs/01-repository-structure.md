# 1. Repository Structure

```text
api_test_tool/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── database/
│   │   ├── generator/
│   │   ├── metrics/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── services/
│   │   │   ├── scenarios/
│   │   │   ├── flows/
│   │   │   ├── executions/
│   │   │   └── reports/
│   │   ├── runner/
│   │   ├── storage/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── index.ts
│   └── scripts/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
├── k6/
│   └── scripts/
├── monitoring/
│   ├── prometheus/
│   └── grafana/
├── scripts/
├── docs/
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md
```

### Design Notes
- Default load generation is external (Docker runner on host machine).
- k3s Kubernetes Job runner is optional and controlled via environment.
- Metrics stream into Prometheus and are visualized in Grafana.
