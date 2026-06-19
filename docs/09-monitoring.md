# 9. Monitoring

Components:
- Prometheus
- Grafana
- Backend /metrics endpoint
- k6 Prometheus remote write output

Files:
- monitoring/prometheus/prometheus.yml
- monitoring/grafana/provisioning/datasources/datasource.yml
- monitoring/grafana/provisioning/dashboards/dashboards.yml
- monitoring/grafana/dashboards/k6-dashboard.json

Collected metrics:
- Latency percentiles: p50, p90, p95, p99
- Request rate / throughput
- Error rate
- Active VUs

Infra metrics roadmap:
- Extend with kube-state-metrics and node-exporter for:
  - CPU
  - Memory
  - Replicas

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001
