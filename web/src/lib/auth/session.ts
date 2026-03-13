'use client';

import { SessionUser } from '@/types';

const ACCESS_TOKEN_KEY = 'accessToken';
const USER_KEY = 'sessionUser';

export function saveSession(accessToken: string, user: SessionUser) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): SessionUser | null {
  const raw = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}
