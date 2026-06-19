# 6. k6 Generator

Location:
- backend/src/generator/k6-generator.ts

Capabilities:
- Dynamic k6 script generation from scenario definition
- Dynamic k6 flow script generation from step-based flow definitions
- Threshold generation (default + custom)
- Scenario templates for smoke/load/stress/spike/soak/custom
- Assertion mapping to k6 checks
- Request metric trend generation

Authentication support in generated scripts:
- none
- bearer
- jwt
- oauth2
- basic
- custom login

Session behavior:
- One login per VU
- Token stored in VU-local in-memory session map
- Token reused across requests

Prometheus output:
- Uses experimental-prometheus-rw output
- Expects K6_PROMETHEUS_RW_SERVER_URL environment variable
