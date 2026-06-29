import { apiClient } from './client.js';

export const authApi = {
  list: () => apiClient.get('/auth/configs'),
  
  get: (id) => apiClient.get(`/auth/configs/${id}`),
  
  create: (data) => apiClient.post('/auth/configs', data),
  
  update: (id, data) => apiClient.put(`/auth/configs/${id}`, data),
  
  delete: (id) => apiClient.delete(`/auth/configs/${id}`),
};
