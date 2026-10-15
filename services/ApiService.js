import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { url } from '../constants/EnvValue';

const TOKEN_KEY = 'USER_AUTH_TOKEN';
const ROLE_KEY = 'USER_AUTH_ROLE';

/**
 * Robust, dependency-free Base64 decoding for React Native environments.
 */
export const parseJwt = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = String(base64).replace(/=+$/, '');
    let output = '';
    for (
      let bc = 0, bs, buffer, idx = 0;
      (buffer = str.charAt(idx++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }

    return JSON.parse(output);
  } catch (e) {
    console.warn('[ApiService] Error parsing JWT:', e);
    return null;
  }
};

/**
 * Checks if a JWT token has expired based on its 'exp' claim.
 */
export const isTokenExpired = (token) => {
  try {
    const payload = parseJwt(token);
    // Fail closed: if the token can't be parsed or has no exp claim, treat it
    // as expired/invalid so a bad token can never be kept as a live session.
    if (!payload || !payload.exp) return true;
    // exp is in seconds, Date.now() is in ms
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

let isLoggingOut = false;
let logoutResetTimer = null;

export const setLoggingOut = (status) => {
  isLoggingOut = status;
};

export const isUserLoggingOut = () => isLoggingOut;

const PUBLIC_ENDPOINTS = [
  /\/api\/employees\/login$/i,
  /\/api\/admins\/login$/i,
  /\/api\/employees\/reset-password$/i,
  /\/api\/admins\/reset-password-phone$/i,
  /\/api\/version\/check$/i,
];

export const isPublicEndpoint = (requestUrl = '') => {
  return PUBLIC_ENDPOINTS.some((pattern) => pattern.test(requestUrl));
};

/**
 * Stores authentication token and optional role securely.
 * Automatically infers role from JWT payload if not provided.
 */
export const storeToken = async (token, role = null) => {
  isLoggingOut = false;
  if (logoutResetTimer) clearTimeout(logoutResetTimer);

  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);

    let resolvedRole = role;
    if (!resolvedRole) {
      const payload = parseJwt(token);
      if (payload?.role) {
        resolvedRole = payload.role;
      }
    }

    if (resolvedRole) {
      await SecureStore.setItemAsync(ROLE_KEY, resolvedRole);
    }
    return true;
  } catch (error) {
    console.error('Error storing token:', error);
    return false;
  }
};

export const getToken = async () => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

export const getRole = async () => {
  try {
    let role = await SecureStore.getItemAsync(ROLE_KEY);
    if (!role) {
      const token = await getToken();
      if (token) {
        const payload = parseJwt(token);
        if (payload?.role) {
          role = payload.role;
          await SecureStore.setItemAsync(ROLE_KEY, role);
        }
      }
    }
    return role;
  } catch (error) {
    console.error('Error retrieving role:', error);
    return null;
  }
};

/**
 * Checks and retrieves active authenticated session.
 * If token is expired, automatically cleans it up and returns null.
 */
export const getActiveSession = async () => {
  try {
    const token = await getToken();
    if (!token) return null;

    if (isTokenExpired(token)) {
      console.log('[ApiService] Stored token has expired. Clearing session.');
      await removeToken();
      return null;
    }

    const role = await getRole();
    return {
      token,
      role: role || 'employee',
    };
  } catch (error) {
    console.error('Error checking active session:', error);
    return null;
  }
};

export const removeToken = async () => {
  isLoggingOut = true;
  if (logoutResetTimer) clearTimeout(logoutResetTimer);
  // Auto-reset latch after 4 seconds
  logoutResetTimer = setTimeout(() => {
    isLoggingOut = false;
  }, 4000);

  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(ROLE_KEY);
    // Wipe all cached API reads so a different user on this device never sees
    // the previous session's holidays/profile/roster/etc. Dynamically imported
    // to avoid any module-load ordering concerns with the interceptors above.
    try {
      const { clearAll } = await import('./CacheService');
      await clearAll();
    } catch (cacheErr) {
      console.warn('[ApiService] Failed to clear caches on logout:', cacheErr?.message || cacheErr);
    }
    // Also detach the Firebase Analytics user id so events after logout are
    // reported anonymously (until the next login re-attaches an id).
    try {
      const { setUserId, logEvent, AnalyticsEvents } = await import('./AnalyticsService');
      await logEvent(AnalyticsEvents.LOGOUT);
      await setUserId(null);
    } catch (analyticsErr) {
      console.warn('[ApiService] Failed to reset analytics on logout:', analyticsErr?.message || analyticsErr);
    }
    return true;
  } catch (error) {
    console.error('Error removing token:', error);
    return false;
  }
};

export const hasToken = async () => {
  const session = await getActiveSession();
  return !!session?.token;
};

/**
 * Safely extracts a user-friendly error message from any caught error.
 * Handles Axios network errors, API error payloads, timeouts, or unknown errors.
 */
export const getApiErrorMessage = (error, defaultMsg = 'Something went wrong. Please check your network connection.') => {
  if (!error) return null;
  if (typeof error === 'string') {
    if (/no token provided/i.test(error)) return null;
    return error;
  }

  // Silent / aborted requests (e.g. during logout or missing token on unmount)
  if (
    error.__silent ||
    error.isAuthAborted ||
    error.isLogoutError ||
    isLoggingOut ||
    axios.isCancel(error)
  ) {
    return null;
  }

  const serverError = error?.response?.data?.error || error?.response?.data?.message;
  if (typeof serverError === 'string' && /no token provided/i.test(serverError)) {
    return null;
  }

  // H-07: Present a clear message for request timeouts / aborted requests.
  if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) {
    return 'The server took too long to respond. Please try again.';
  }

  return (
    serverError ||
    error?.message ||
    defaultMsg
  );
};

/**
 * Central pre-configured Axios instance for all authenticated API calls.
 *
 * - baseURL is set from EnvValue so callers pass only the path
 *   (e.g. api.get('/api/employees/dashboard')).
 * - A request interceptor injects `Authorization: Bearer <token>` from
 *   SecureStore automatically, so screens no longer build headers by hand
 *   (this also removes the inconsistent `authorization`/`Authorization` casing).
 * - A response interceptor clears the local session on any non-login 401.
 *
 * Usage:
 *   import { api } from '../services/ApiService';
 *   const { data } = await api.get('/api/transactions/employee', { params: { year } });
 */
export const api = axios.create({
  baseURL: url,
  // H-07: Fail fast on unresponsive servers (e.g. Vercel cold starts / network
  // stalls) instead of hanging the UI indefinitely. getApiErrorMessage surfaces
  // the timeout to the user via error.message.
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const requestUrl = config.url || '';
  const isPublic = isPublicEndpoint(requestUrl);
  const token = await getToken();

  // If the user has logged out or is logging out, and this is a protected endpoint,
  // abort early rather than sending an unauthenticated request over the network.
  if (!token && !isPublic) {
    const authError = new Error('Request aborted: No authentication token');
    authError.__silent = true;
    authError.isAuthAborted = true;
    authError.isLogoutError = isLoggingOut;
    return Promise.reject(authError);
  }

  config.headers = config.headers || {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Inject client app version metadata for defense-in-depth API policy
  const versionCode =
    Platform.OS === 'android'
      ? Constants.expoConfig?.android?.versionCode || 18
      : parseInt(Constants.expoConfig?.ios?.buildNumber || '18', 10);

  config.headers['x-app-version-code'] = String(versionCode);
  config.headers['x-app-platform'] = Platform.OS;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestUrl = error.config?.url || '';
    const isLoginRequest = isPublicEndpoint(requestUrl) || /\/login$/i.test(requestUrl);

    if (error?.response?.status === 401) {
      if (!isLoginRequest) {
        if (!isLoggingOut) {
          console.warn('[ApiService] Received 401 Unauthorized. Clearing local session.');
          await removeToken();
        } else {
          error.__silent = true;
          error.isLogoutError = true;
        }
      }
    } else if (error?.response?.status === 426) {
      console.warn('[ApiService] Received 426 Upgrade Required from backend.');
      if (typeof globalThis.__onAppUpdateRequired === 'function') {
        globalThis.__onAppUpdateRequired(error.response?.data);
      }
    }

    if (isLoggingOut || error?.response?.data?.error === 'No token provided') {
      error.__silent = true;
      error.isLogoutError = true;
    }

    return Promise.reject(error);
  }
);
