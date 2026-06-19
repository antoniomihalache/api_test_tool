import { apiClient } from './client';
import { Service, ApiResponse } from '../types';

export const servicesApi = {
  list: (tags?: string) =>
    apiClient.get<ApiResponse<Service[]>>('/services', { params: tags ? { tags } : undefined }),

  get: (id: string) => apiClient.get<ApiResponse<Service>>(`/services/${id}`),

  create: (data: Partial<Service>) => apiClient.post<ApiResponse<Service>>('/services', data),

  update: (id: string, data: Partial<Service>) =>
    apiClient.put<ApiResponse<Service>>(`/services/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/services/${id}`),
};
