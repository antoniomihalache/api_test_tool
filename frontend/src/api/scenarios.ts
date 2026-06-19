import { apiClient } from './client';
import { Scenario, ApiResponse } from '../types';

export const scenariosApi = {
  list: (serviceId?: string) =>
    apiClient.get<ApiResponse<Scenario[]>>('/scenarios', {
      params: serviceId ? { serviceId } : undefined,
    }),

  get: (id: string) => apiClient.get<ApiResponse<Scenario>>(`/scenarios/${id}`),

  create: (data: Partial<Scenario>) => apiClient.post<ApiResponse<Scenario>>('/scenarios', data),

  update: (id: string, data: Partial<Scenario>) =>
    apiClient.put<ApiResponse<Scenario>>(`/scenarios/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/scenarios/${id}`),
};
