import 'fake-indexeddb/auto';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DexieVaultRepository } from '@/infrastructure/persistence/dexieVaultRepository';
import { setVaultDeps, useVaultStore } from '@/presentation/state/vaultStore';
import {
  DEFAULT_IDLE_MS,
  getIdleLockMs,
  setIdleLockMs,
  useIdleLock,
} from './useIdleLock';

describe('idle lock helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('未存储时返回默认值', () => {
    expect(getIdleLockMs()).toBe(DEFAULT_IDLE_MS);
  });

  it('setIdleLockMs / getIdleLockMs 往返', () => {
    setIdleLockMs(5_000);
    expect(getIdleLockMs()).toBe(5_000);
  });

  it('非法值回退到默认', () => {
    window.localStorage.setItem('quiet:idle-lock-ms', 'abc');
    expect(getIdleLockMs()).toBe(DEFAULT_IDLE_MS);
  });
});

describe('useIdleLock 行为（真实计时器 + 短延时）', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    setVaultDeps({
      repo: new DexieVaultRepository(`il-${Math.random().toString(36).slice(2)}`),
    });
    await useVaultStore.getState().init();
    await useVaultStore.getState().setup('hunter2');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function waitMs(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  it('已解锁时空闲超时自动 lock', async () => {
    setIdleLockMs(80);
    renderHook(() => useIdleLock());
    expect(useVaultStore.getState().status).toBe('unlocked');
    await act(async () => {
      await waitMs(150);
    });
    expect(useVaultStore.getState().status).toBe('locked');
  });

  it('idle=0 时禁用自动锁', async () => {
    setIdleLockMs(0);
    renderHook(() => useIdleLock());
    await act(async () => {
      await waitMs(120);
    });
    expect(useVaultStore.getState().status).toBe('unlocked');
  });

  it('用户活动重置计时器', async () => {
    setIdleLockMs(120);
    renderHook(() => useIdleLock());
    await act(async () => {
      await waitMs(80);
    });
    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });
    await act(async () => {
      await waitMs(80);
    });
    expect(useVaultStore.getState().status).toBe('unlocked');
    await act(async () => {
      await waitMs(80);
    });
    expect(useVaultStore.getState().status).toBe('locked');
  });
});
