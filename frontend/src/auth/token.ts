const ACCESS_TOKEN_KEY = "inking_access_token";
const REFRESH_TOKEN_KEY = "inking_refresh_token";
const AUTH_CHANGED_EVENT = "inking:auth-changed";

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  notifyAuthChanged();
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  notifyAuthChanged();
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function subscribeAuthChanged(onChange: () => void) {
  window.addEventListener(AUTH_CHANGED_EVENT, onChange);
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, onChange);
}
