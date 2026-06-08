import { create } from 'zustand';
import { syncEntries, type SyncResult } from '@/application/usecases/syncEntries';
import type { IRemoteSyncAdapter } from '@/domain/repositories/IRemoteSyncAdapter';
import {
  WebdavSyncAdapter,
  type WebDavConfig,
} from '@/infrastructure/sync/webdavSyncAdapter';
import { PocketBaseSyncAdapter } from '@/infrastructure/sync/pocketbaseSyncAdapter';
import { useEntryStore, reloadEntries } from './entryStore';
import { useAuthStore } from './authStore';
import { logger } from '@/shared/logger';

const CONFIG_KEY = 'quiet:sync-config';
const LEGACY_WEBDAV_KEY = 'quiet:webdav-config';
const LAST_SYNC_KEY = 'quiet:last-sync';

export type SyncStatus = 'idle' | 'testing' | 'syncing' | 'ok' | 'error';

export type SyncConfig =
  | ({ kind: 'webdav' } & WebDavConfig)
  | { kind: 'pocketbase'; baseUrl: string };

interface SyncState {
  config: SyncConfig | null;
  status: SyncStatus;
  lastSyncAt: number | null;
  lastResult: SyncResult | null;
  error?: string;

  loadConfig: () => void;
  saveConfig: (cfg: SyncConfig | null) => void;
  test: () => Promise<void>;
  sync: () => Promise<void>;
}

function readConfig(): SyncConfig | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(CONFIG_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as SyncConfig;
    } catch {
      return null;
    }
  }
  // 向后兼容：旧 webdav 配置自动迁移
  const legacy = window.localStorage.getItem(LEGACY_WEBDAV_KEY);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as WebDavConfig;
      return { kind: 'webdav', ...parsed };
    } catch {
      return null;
    }
  }
  return null;
}

function readLastSync(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(LAST_SYNC_KEY);
  return raw ? Number(raw) : null;
}

/** 根据配置 + 当前认证状态创建对应 adapter */
export function makeAdapter(cfg: SyncConfig): IRemoteSyncAdapter {
  if (cfg.kind === 'webdav') {
    return new WebdavSyncAdapter(cfg);
  }
  const auth = useAuthStore.getState();
  return new PocketBaseSyncAdapter({
    baseUrl: cfg.baseUrl,
    token: auth.token ?? '',
    userId: auth.user?.id ?? '',
  });
}

export const useSyncStore = create<SyncState>((set, get) => ({
  config: null,
  status: 'idle',
  lastSyncAt: null,
  lastResult: null,

  loadConfig() {
    set({ config: readConfig(), lastSyncAt: readLastSync() });
  },

  saveConfig(cfg) {
    if (cfg) {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    } else {
      window.localStorage.removeItem(CONFIG_KEY);
      window.localStorage.removeItem(LEGACY_WEBDAV_KEY);
    }
    set({ config: cfg });
  },

  async test() {
    const cfg = get().config;
    if (!cfg) {
      set({ error: '请先填写同步配置', status: 'error' });
      return;
    }
    set({ status: 'testing', error: undefined });
    try {
      const adapter = makeAdapter(cfg);
      await adapter.ping();
      set({ status: 'ok' });
    } catch (e) {
      logger.warn({ feature: 'sync', action: 'test_fail', error: e });
      set({ status: 'error', error: (e as Error).message });
    }
  },

  async sync() {
    const cfg = get().config;
    if (!cfg) {
      set({ error: '请先填写同步配置', status: 'error' });
      return;
    }
    set({ status: 'syncing', error: undefined });
    try {
      const adapter = makeAdapter(cfg);
      const result = await syncEntries({
        local: useEntryStore.getState().baseRepo,
        remote: adapter,
      });
      const now = Date.now();
      window.localStorage.setItem(LAST_SYNC_KEY, String(now));
      set({ status: 'ok', lastSyncAt: now, lastResult: result });
      await reloadEntries();
    } catch (e) {
      logger.error({ feature: 'sync', action: 'sync_fail', error: e });
      set({ status: 'error', error: (e as Error).message });
    }
  },
}));
