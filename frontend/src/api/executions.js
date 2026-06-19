import { apiClient } from './client.js';

export const executionsApi = {
  list: (params) =>
    apiClient.get('/executions', { params }),

  get: (id) => apiClient.get(`/executions/${id}`),

  launch: (scenarioId) =>
    apiClient.post('/executions/launch', { scenarioId }),

  cancel: (id) => apiClient.patch(`/executions/${id}/cancel`),
};

export const reportsApi = {
  list: (executionId) =>
    apiClient.get(`/executions/${executionId}/reports`),

  generate: (executionId, format) =>
    apiClient.post(`/executions/${executionId}/reports`, { format }),

  downloadUrl: (executionId, reportId) =>
    `${apiClient.defaults.baseURL}/executions/${executionId}/reports/${reportId}/download`,
};
