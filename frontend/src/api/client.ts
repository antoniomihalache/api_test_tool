import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

function normalizeMongoIds<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => normalizeMongoIds(item)) as T;
  }
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_id' && obj.id === undefined) {
        normalized.id = String(value);
      } else {
        normalized[key] = normalizeMongoIds(value);
      }
    }
    return normalized as T;
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

// Redirect to login on 401
apiClient.interceptors.response.use(
  (res) => {
    res.data = normalizeMongoIds(res.data);
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('perf_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
