import axios from 'axios';

// Base API configuration with intelligent suffix resolution (/api/v1)
const rawApiUrl = (import.meta.env?.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
const API_BASE_URL = rawApiUrl.endsWith('/api/v1')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Flag to avoid infinite refresh token loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ==============================================================================
// Request Interceptor: Attach JWT Bearer Token & Correlation IDs
// ==============================================================================
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kn_access_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach correlation ID if not present
    if (!config.headers['X-Correlation-ID']) {
      config.headers['X-Correlation-ID'] = `WEB-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==============================================================================
// Response Interceptor: JWT Refresh Token Rotation & Error Handling
// ==============================================================================
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (Expired Access Token)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('kn_refresh_token');
      if (!refreshToken) {
        // No refresh token available -> Clear session and redirect/dispatch
        localStorage.removeItem('kn_access_token');
        localStorage.removeItem('kn_refresh_token');
        localStorage.removeItem('kn_user');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token || refreshToken;

        localStorage.setItem('kn_access_token', newAccessToken);
        localStorage.setItem('kn_refresh_token', newRefreshToken);
        if (data.user) {
          localStorage.setItem('kn_user', JSON.stringify(data.user));
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('kn_access_token');
        localStorage.removeItem('kn_refresh_token');
        localStorage.removeItem('kn_user');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper for extracting clean, role-safe error message
export const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred';

  // Specific 403 Forbidden / Scope Violation handling
  if (error.response?.status === 403) {
    const backendMsg = error.response.data?.error?.message || error.response.data?.message;
    if (backendMsg && typeof backendMsg === 'string') {
      // Filter out any internal traces or database exceptions
      if (!backendMsg.toLowerCase().includes('traceback') && !backendMsg.includes('SELECT ') && !backendMsg.includes('sqlalchemy')) {
        return backendMsg;
      }
    }
    return "You don't have permission to access this resource or it is outside your authorized institutional scope.";
  }

  // 401 Unauthorized handling
  if (error.response?.status === 401) {
    return "Your authentication session has expired or is invalid. Please sign in again.";
  }

  // 404 Not Found handling
  if (error.response?.status === 404) {
    const backendMsg = error.response.data?.error?.message || error.response.data?.message;
    return backendMsg || "The requested record could not be found in the system.";
  }

  // Standard API structured error responses
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.detail) {
    return typeof error.response.data.detail === 'string'
      ? error.response.data.detail
      : JSON.stringify(error.response.data.detail);
  }

  return error.message || 'An unexpected network error occurred';
};
