import { apiClient } from './client.js';

export const scenariosApi = {
  list: (serviceId) =>
    apiClient.get('/scenarios', {
      params: serviceId ? { serviceId } : undefined,
    }),

  get: (id) => apiClient.get(`/scenarios/${id}`),

  create: (data) => apiClient.post('/scenarios', data),

  update: (id, data) =>
    apiClient.put(`/scenarios/${id}`, data),

  delete: (id) => apiClient.delete(`/scenarios/${id}`),
};
