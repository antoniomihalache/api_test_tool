import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

function normalizeMongoIds(input) {
  if (Array.isArray(input)) {
    return input.map((item) => normalizeMongoIds(item));
  }
  if (input && typeof input === 'object') {
    const obj = input;
    const normalized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_id' && obj.id === undefined) {
        normalized.id = String(value);
      } else {
        normalized[key] = normalizeMongoIds(value);
      }
    }
    return normalized;
  }
  return input;
}

// Attach JWT token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('perf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401 (but not for the login endpoint itself)
apiClient.interceptors.response.use(
  (res) => {
    res.data = normalizeMongoIds(res.data);
    return res;
  },
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('perf_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
