# 8. Kubernetes Runner (Optional)

Location:
- backend/src/runner/k8s-runner.ts

Mode activation:
- Set RUNNER_MODE=kubernetes in .env

Execution flow:
1. Backend generates k6 script
2. Backend creates ConfigMap with test script
3. Backend creates Kubernetes Job in perf-tests namespace
4. k6 pod executes script and pushes metrics to Prometheus
5. Backend polls job state and captures final logs

Manifest strategy:
- Job uses grafana/k6 image
- Script mounted from ConfigMap
- TTL cleanup enabled via ttlSecondsAfterFinished

Requirements:
- kubectl available on backend runtime
- kubeconfig mounted and valid
- namespace created and permissions configured

Current status:
- Implemented as optional future mode
- Default remains docker external runner
