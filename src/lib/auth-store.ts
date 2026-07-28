export type AuthMode = 'email' | 'google' | 'apple' | 'facebook' | 'guest';

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  mode: AuthMode;
};

const AUTH_KEY = 'reply.auth.v1';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function nameFromEmail(email: string) {
  const local = email.split('@')[0] ?? 'Athlete';
  const cleaned = local.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return 'Athlete';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function loadAuthUser(): AuthUser | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id || !parsed?.name || !parsed?.mode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuthUser(user: AuthUser) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } catch {
    // ignore quota
  }
}

export function clearAuthUser() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(AUTH_KEY);
}

export function createEmailUser(email: string): AuthUser {
  const normalized = email.trim().toLowerCase();
  return {
    id: `u_${normalized}`,
    name: nameFromEmail(normalized),
    email: normalized,
    mode: 'email',
  };
}

export function createGuestUser(): AuthUser {
  return {
    id: `guest_${Date.now()}`,
    name: 'Guest',
    email: null,
    mode: 'guest',
  };
}

export function createSocialUser(
  provider: 'google' | 'apple' | 'facebook',
  name: string,
  email: string,
): AuthUser {
  const normalized = email.trim().toLowerCase();
  return {
    id: `${provider}_${normalized}`,
    name,
    email: normalized,
    mode: provider,
  };
}

/** Simulated auth latency — soft-launch uses local demo profiles only. */
export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
