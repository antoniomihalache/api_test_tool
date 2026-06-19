# 4. Backend APIs

Base path: /api/v1

## Auth
- POST /auth/login
- GET /auth/configs
- POST /auth/configs
- GET /auth/configs/:id
- PUT /auth/configs/:id
- DELETE /auth/configs/:id

## Services
- GET /services
- POST /services
- GET /services/:id
- PUT /services/:id
- DELETE /services/:id

## Scenarios
- GET /scenarios
- POST /scenarios
- GET /scenarios/:id
- PUT /scenarios/:id
- DELETE /scenarios/:id

## Flows
- GET /flows
- POST /flows
- GET /flows/:id
- PUT /flows/:id
- DELETE /flows/:id

## Executions
- GET /executions
- POST /executions
- GET /executions/:id
- POST /executions/:id/cancel
- POST /executions/:id/archive

## Reports
- GET /reports
- GET /reports/:id/download
- GET /executions/:executionId/reports
- POST /executions/:executionId/reports
- GET /executions/:executionId/reports/:id/download

## System
- GET /health
- GET /metrics

### Required Endpoints from Spec
- POST /services: implemented
- GET /services: implemented
- POST /executions: implemented
- GET /executions: implemented
- POST /flows: implemented
- GET /reports: implemented
