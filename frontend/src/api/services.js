import { apiClient } from './client.js';

export const servicesApi = {
  list: (tags) =>
    apiClient.get('/services', { params: tags ? { tags } : undefined }),

  get: (id) => apiClient.get(`/services/${id}`),

  create: (data) => apiClient.post('/services', data),

  update: (id, data) =>
    apiClient.put(`/services/${id}`, data),

  delete: (id) => apiClient.delete(`/services/${id}`),
};
