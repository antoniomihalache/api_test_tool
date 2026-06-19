import { apiClient } from './client';
import { Execution, Report, ApiResponse } from '../types';

export const executionsApi = {
  list: (params?: { status?: string; serviceId?: string; limit?: number }) =>
    apiClient.get<ApiResponse<Execution[]>>('/executions', { params }),

  get: (id: string) => apiClient.get<ApiResponse<Execution>>(`/executions/${id}`),

  start: (data: { scenarioId?: string; flowId?: string; name?: string }) =>
    apiClient.post<ApiResponse<Execution>>('/executions', data),

  cancel: (id: string) => apiClient.post<ApiResponse<Execution>>(`/executions/${id}/cancel`),

  archive: (id: string) => apiClient.post<ApiResponse<Execution>>(`/executions/${id}/archive`),
};

export const reportsApi = {
  list: (executionId: string) =>
    apiClient.get<ApiResponse<Report[]>>(`/executions/${executionId}/reports`),

  generate: (executionId: string, format: 'html' | 'json' | 'csv') =>
    apiClient.post<ApiResponse<Report>>(`/executions/${executionId}/reports`, { format }),

  downloadUrl: (executionId: string, reportId: string) =>
    `${apiClient.defaults.baseURL}/executions/${executionId}/reports/${reportId}/download`,
};
