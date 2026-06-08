import 'fake-indexeddb/auto';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncStore } from './syncStore';
import { useAuthStore } from './authStore';

function mockResp(status: number, body?: string) {
  const noBody = status === 204 || status === 304;
  return Promise.resolve(
    new Response(noBody ? null : (body ?? ''), { status }),
  );
}

describe('syncStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSyncStore.setState({
      config: null,
      status: 'idle',
      lastSyncAt: null,
      lastResult: null,
      error: undefined,
    });
    useAuthStore.setState({
      baseUrl: null,
      token: null,
      user: null,
      loading: false,
      error: undefined,
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('loadConfig 无配置返回 null', () => {
    useSyncStore.getState().loadConfig();
    expect(useSyncStore.getState().config).toBeNull();
  });

  it('saveConfig WebDAV 写入 localStorage 与 store', () => {
    act(() => {
      useSyncStore.getState().saveConfig({
        kind: 'webdav',
        baseUrl: 'https://x/',
        username: 'u',
        password: 'p',
      });
    });
    expect(useSyncStore.getState().config?.kind).toBe('webdav');
    expect(window.localStorage.getItem('quiet:sync-config')).toContain('"u"');
  });

  it('saveConfig(null) 清除', () => {
    act(() => {
      useSyncStore.getState().saveConfig({
        kind: 'webdav',
        baseUrl: 'x',
        username: 'u',
        password: 'p',
      });
      useSyncStore.getState().saveConfig(null);
    });
    expect(useSyncStore.getState().config).toBeNull();
    expect(window.localStorage.getItem('quiet:sync-config')).toBeNull();
  });

  it('test 无配置 → error', async () => {
    await act(async () => {
      await useSyncStore.getState().test();
    });
    expect(useSyncStore.getState().status).toBe('error');
  });

  it('test WebDAV 成功 → ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(mockResp(207));
    act(() => {
      useSyncStore.getState().saveConfig({
        kind: 'webdav',
        baseUrl: 'https://x/',
        username: 'u',
        password: 'p',
      });
    });
    await act(async () => {
      await useSyncStore.getState().test();
    });
    expect(useSyncStore.getState().status).toBe('ok');
  });

  it('test WebDAV 失败 → error', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(mockResp(401));
    act(() => {
      useSyncStore.getState().saveConfig({
        kind: 'webdav',
        baseUrl: 'https://x/',
        username: 'u',
        password: 'p',
      });
    });
    await act(async () => {
      await useSyncStore.getState().test();
    });
    expect(useSyncStore.getState().status).toBe('error');
  });

  it('test PocketBase 成功', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(
      Promise.resolve(
        new Response(JSON.stringify({ status: 'OK' }), { status: 200 }),
      ),
    );
    act(() => {
      useSyncStore.getState().saveConfig({
        kind: 'pocketbase',
        baseUrl: 'https://pb/',
      });
    });
    await act(async () => {
      await useSyncStore.getState().test();
    });
    expect(useSyncStore.getState().status).toBe('ok');
  });

  it('sync 无配置 → error', async () => {
    await act(async () => {
      await useSyncStore.getState().sync();
    });
    expect(useSyncStore.getState().status).toBe('error');
  });

  it('loadConfig 读取已存储的新格式 JSON', () => {
    window.localStorage.setItem(
      'quiet:sync-config',
      JSON.stringify({
        kind: 'webdav',
        baseUrl: 'https://x/',
        username: 'u',
        password: 'p',
      }),
    );
    window.localStorage.setItem('quiet:last-sync', '12345');
    useSyncStore.getState().loadConfig();
    const c = useSyncStore.getState().config;
    expect(c?.kind).toBe('webdav');
    expect(useSyncStore.getState().lastSyncAt).toBe(12345);
  });

  it('loadConfig 兼容旧 webdav 配置自动迁移', () => {
    window.localStorage.setItem(
      'quiet:webdav-config',
      JSON.stringify({ baseUrl: 'https://x/', username: 'u', password: 'p' }),
    );
    useSyncStore.getState().loadConfig();
    const c = useSyncStore.getState().config;
    expect(c?.kind).toBe('webdav');
    if (c?.kind === 'webdav') expect(c.username).toBe('u');
  });

  it('loadConfig 损坏 JSON → null', () => {
    window.localStorage.setItem('quiet:sync-config', '{not-json');
    useSyncStore.getState().loadConfig();
    expect(useSyncStore.getState().config).toBeNull();
  });

  it('loadConfig 损坏的旧 webdav 配置 → null', () => {
    window.localStorage.setItem('quiet:webdav-config', '{not-json');
    useSyncStore.getState().loadConfig();
    expect(useSyncStore.getState().config).toBeNull();
  });
});
