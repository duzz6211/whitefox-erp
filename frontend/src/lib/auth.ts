import type { User } from '../types';

const TOKEN_KEY = 'whitefox_token';
const USER_KEY = 'whitefox_user';
const LEGACY_TOKEN_KEY = 'ddorang_token';
const LEGACY_USER_KEY = 'ddorang_user';

// 기존 세션이 있으면 새 키로 마이그레이션 (1회성)
(function migrateLegacyKeys() {
  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken && !localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, legacyToken);
  }
  const legacyUser = localStorage.getItem(LEGACY_USER_KEY);
  if (legacyUser && !localStorage.getItem(USER_KEY)) {
    localStorage.setItem(USER_KEY, legacyUser);
  }
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
})();

export function saveAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}
