import { create } from 'zustand';
import { logger } from '@/shared/logger';

const AUTH_KEY = 'quiet:pb-auth';

export interface AuthUser {
  id: string;
  email: string;
  verified: boolean;
}

interface AuthState {
  baseUrl: string | null;
  token: string | null;
  user: AuthUser | null;
  error?: string;
  loading: boolean;

  init: () => void;
  signIn: (baseUrl: string, email: string, password: string) => Promise<void>;
  signUp: (
    baseUrl: string,
    email: string,
    password: string,
    passwordConfirm: string,
  ) => Promise<void>;
  signOut: () => void;
}

interface PersistedAuth {
  baseUrl: string;
  token: string;
  user: AuthUser;
}

function readStored(): PersistedAuth | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedAuth;
  } catch {
    return null;
  }
}

function persist(p: PersistedAuth | null): void {
  if (p) window.localStorage.setItem(AUTH_KEY, JSON.stringify(p));
  else window.localStorage.removeItem(AUTH_KEY);
}

interface PbAuthResponse {
  token: string;
  record: { id: string; email: string; verified: boolean };
}

async function pbAuthWithPassword(
  baseUrl: string,
  email: string,
  password: string,
): Promise<PbAuthResponse> {
  const res = await fetch(
    `${baseUrl.replace(/\/+$/, '')}/api/collections/users/auth-with-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
    },
  );
  if (!res.ok) {
    let msg = `登录失败 (${res.status})`;
    try {
      const j = (await res.json()) as { message?: string };
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as PbAuthResponse;
}

async function pbCreateUser(
  baseUrl: string,
  email: string,
  password: string,
  passwordConfirm: string,
): Promise<void> {
  const res = await fetch(
    `${baseUrl.replace(/\/+$/, '')}/api/collections/users/records`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, passwordConfirm }),
    },
  );
  if (!res.ok) {
    let msg = `注册失败 (${res.status})`;
    try {
      const j = (await res.json()) as { message?: string };
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}

async function pbRequestVerification(baseUrl: string, email: string): Promise<void> {
  await fetch(
    `${baseUrl.replace(/\/+$/, '')}/api/collections/users/request-verification`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
  );
}

export const useAuthStore = create<AuthState>((set, get) => ({
  baseUrl: null,
  token: null,
  user: null,
  loading: false,

  init() {
    const stored = readStored();
    if (stored) {
      set({ baseUrl: stored.baseUrl, token: stored.token, user: stored.user });
    }
  },

  async signIn(baseUrl, email, password) {
    set({ loading: true, error: undefined });
    try {
      const r = await pbAuthWithPassword(baseUrl, email, password);
      const user: AuthUser = {
        id: r.record.id,
        email: r.record.email,
        verified: r.record.verified,
      };
      persist({ baseUrl, token: r.token, user });
      set({ baseUrl, token: r.token, user, loading: false });
      logger.info({ feature: 'auth', action: 'signin_ok', resp: { uid: user.id } });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  async signUp(baseUrl, email, password, passwordConfirm) {
    set({ loading: true, error: undefined });
    try {
      await pbCreateUser(baseUrl, email, password, passwordConfirm);
      // 注册后立刻请求发送验证邮件 + 顺便登录
      await pbRequestVerification(baseUrl, email);
      await get().signIn(baseUrl, email, password);
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  signOut() {
    persist(null);
    set({ baseUrl: null, token: null, user: null, error: undefined });
    logger.info({ feature: 'auth', action: 'signout' });
  },
}));
