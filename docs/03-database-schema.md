# 3. Database Schema

Collections:
- users
- authconfigs
- services
- scenarios
- flows
- executions
- reports

## users
- email: string (unique)
- password: string (bcrypt hash)
- role: admin | editor | viewer
- createdAt, updatedAt

## authconfigs
- name: string
- type: none | bearer | jwt | oauth2 | basic | custom
- loginEndpoint: string
- loginHeaders: map<string, string>
- loginBody: map<string, mixed>
- tokenExtractPath: string
- tokenHeaderName: string
- refreshEndpoint: string
- refreshTokenPath: string
- staticToken: string
- username: string
- password: string
- createdAt, updatedAt

## services
- name: string
- description: string
- environments[]:
  - name: dev | qa | staging | production
  - baseUrl: string
- namespace: string
- tags[]: string
- authConfigId: ObjectId(authconfigs)
- createdAt, updatedAt

## scenarios
- name: string
- description: string
- type: smoke | load | stress | spike | soak | custom
- serviceId: ObjectId(services)
- environment: dev | qa | staging | production
- authConfigId: ObjectId(authconfigs)
- vus: number
- duration: string
- stages[]: { duration, target }
- thresholds[]: { metric, condition }
- requests[]:
  - id, name
  - method, path
  - headers, body
  - assertions[]
- createdAt, updatedAt

## flows
- name, description
- serviceId
- environment
- authConfigId
- vus, duration
- steps[]:
  - id, name, method, path
  - headers, body
  - extractVars[]: { name, jsonPath }
  - assertions[]
  - condition
- createdAt, updatedAt

## executions
- name
- scenarioId | flowId
- serviceId
- environment
- status: pending | running | completed | failed | cancelled | archived
- runnerMode: docker | kubernetes
- containerId
- k8sJobName
- startedAt, completedAt
- metrics:
  - p50, p90, p95, p99
  - avg, min, max
  - rps, totalRequests
  - errorRate, successRate
- reportPath
- logs[]
- createdAt, updatedAt

## reports
- executionId: ObjectId(executions)
- format: html | json | csv
- filePath
- createdAt, updatedAt
