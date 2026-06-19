# 2. Architecture Diagram

```mermaid
flowchart TD
    A[Dashboard UI<br/>React + Vite] --> B[Backend API<br/>Express + TypeScript]
    B --> C[Execution Manager]

    C --> D[External Runner<br/>Docker k6 - default]
    C --> E[Kubernetes Runner<br/>k6 Job - optional]

    D --> F[Ingress / LB]
    E --> F

    F --> G[Target Services in k3s VM]

    D --> H[Prometheus Remote Write]
    E --> H

    H --> I[Prometheus]
    I --> J[Grafana]

    B --> K[(MongoDB)]
    B --> L[Report Storage]

    classDef external fill:#0f172a,stroke:#3b82f6,stroke-width:1px,color:#e2e8f0;
    classDef target fill:#172554,stroke:#93c5fd,stroke-width:1px,color:#e2e8f0;
    classDef data fill:#1e293b,stroke:#14b8a6,stroke-width:1px,color:#e2e8f0;

    class A,B,C,D,E external;
    class G target;
    class H,I,J,K,L data;
```

### Resource Strategy
- Application under test is inside a constrained VM (8 CPU / 16 GB RAM).
- Load generation stays outside the VM by default to avoid stealing CPU and memory.
