/**
 * Session Storage Utility
 *
 * Provides tab-specific token storage using sessionStorage.
 * Each browser tab maintains its own independent session.
 * - Different tabs = different sessions
 * - Refreshing a tab = same session persists
 * - Closing a tab = session ends
 * - Different browsers = different sessions
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

// Cookie name used only for middleware to detect potential auth
const AUTH_PRESENCE_COOKIE = 'hasSession';

function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Set a cookie (used only for middleware auth presence check)
 */
function setCookie(name: string, value: string, days: number): void {
  if (!isClient()) return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

/**
 * Remove a cookie
 */
function removeCookie(name: string): void {
  if (!isClient()) return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

/**
 * Get access token from sessionStorage
 */
export function getAccessToken(): string | null {
  if (!isClient()) return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from sessionStorage
 */
export function getRefreshToken(): string | null {
  if (!isClient()) return null;
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store tokens in sessionStorage (tab-specific)
 * Also sets a presence cookie for middleware
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  if (!isClient()) return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  // Set presence cookie for middleware (7 days, matching refresh token)
  setCookie(AUTH_PRESENCE_COOKIE, '1', 7);
}

/**
 * Update only the access token (used during refresh)
 */
export function setAccessToken(accessToken: string): void {
  if (!isClient()) return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

/**
 * Update only the refresh token (used during refresh)
 */
export function setRefreshToken(refreshToken: string): void {
  if (!isClient()) return;
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Clear all session data (tab-specific)
 * Note: presence cookie removal is per-browser, but actual tokens are per-tab
 */
export function clearSession(): void {
  if (!isClient()) return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  // Don't remove the presence cookie here - other tabs may still have sessions
  // The middleware will let through, but client will redirect if no token
}

/**
 * Store user data in sessionStorage
 */
export function setUser(user: object): void {
  if (!isClient()) return;
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get user data from sessionStorage
 */
export function getUser<T = object>(): T | null {
  if (!isClient()) return null;
  const data = sessionStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Check if this tab has a session
 */
export function hasSession(): boolean {
  if (!isClient()) return false;
  return !!getAccessToken();
}
