import { supabase } from '../api/supabase';
import type { User } from '../types';

const USER_KEY = 'whitefox_user';

export function saveAuth(_token: string, user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(USER_KEY);
  supabase.auth.signOut();
}

export function getToken(): string | null {
  return localStorage.getItem(USER_KEY) ? 'supabase' : null;
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function setUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
