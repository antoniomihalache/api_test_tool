# 7. External Runner (Default)

Location:
- backend/src/runner/docker-runner.ts

Execution flow:
1. Dashboard requests execution start
2. Backend generates k6 script
3. Backend writes script to shared host path
4. Backend creates ephemeral Docker container from grafana/k6 image
5. k6 runs against target base URL through host networking
6. Logs and metrics are captured
7. Execution status and summary metrics stored in MongoDB

Why external-by-default:
- Keeps load generation outside constrained target VM
- Avoids CPU/memory contention with application pods
- Easier horizontal scale by adding external runner hosts

Cancel support:
- Stops and removes k6 container by container id

Output:
- Metrics parsed from k6 stdout summary
- Prometheus remote-write stream for dashboarding
