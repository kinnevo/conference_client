import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearSession,
} from './session';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach access token
// Note: All users now use the 'live' signals table to ensure consistency across all users
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Single-flight refresh: only one refresh call in flight at a time.
// Concurrent 401s all wait on the same promise instead of each calling /refresh.
let refreshPromise: Promise<string> | null = null;

async function doRefresh(retryCount = 0): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.warn('[API] No refresh token available');
    throw new Error('No refresh token');
  }

  try {
    console.log(`[API] Initiating token refresh (attempt ${retryCount + 1})`);
    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
      { refreshToken }
    );

    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    console.log('[API] Token refresh successful');
    return data.accessToken;
  } catch (error: any) {
    console.error('[API] Token refresh failed:', error.message);

    // Retry on network errors or 5xx errors (max 2 retries)
    if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.response?.status >= 500)) {
      const delay = 500 * (retryCount + 1); // 500ms, then 1000ms
      console.log(`[API] Retrying refresh in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return doRefresh(retryCount + 1);
    }

    throw error;
  }
}

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('[API] 401 received, attempting token refresh');
      originalRequest._retry = true;

      try {
        // Reuse an in-flight refresh, or start a new one
        if (!refreshPromise) {
          console.log('[API] Starting new refresh request');
          refreshPromise = doRefresh().finally(() => {
            refreshPromise = null;
          });
        } else {
          console.log('[API] Refresh already in progress, waiting...');
        }

        const accessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        console.log('[API] Retrying original request with new token');
        return api(originalRequest);
      } catch (refreshError: any) {
        // Refresh failed - clear session and redirect to login
        console.error('[API] Refresh failed, clearing session:', refreshError.message);
        clearSession();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
