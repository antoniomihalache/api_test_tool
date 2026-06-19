# 10. Documentation

## Local Setup
1. Copy environment file:
   - cp .env.example .env
2. Build and start stack:
   - docker compose up -d --build
3. Seed data:
   - cd backend && npm run seed
4. Open dashboard:
   - http://localhost:3000

## Default Credentials
- email: admin@perf-platform.local
- password: Admin1234!

## Developer Commands
- npm run dev
- npm run build
- npm run perf
- npm run seed

## Testing Strategy
- API contract tests for all endpoints
- k6 smoke tests in CI
- Scheduled soak tests in QA environment

## Security Notes
- JWT required for platform API access
- Rate limiting enabled
- Helmet security headers enabled
- Sensitive auth fields not returned in auth config responses

## Next Extensions
- Redis queue for asynchronous execution scheduling
- WebSocket streaming for live execution output
- Git-based test scenario versioning
- Role-based access control granularity
