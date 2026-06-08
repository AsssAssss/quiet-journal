import 'fake-indexeddb/auto';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DexieVaultRepository } from '@/infrastructure/persistence/dexieVaultRepository';
import { setVaultDeps, useVaultStore } from './vaultStore';

function reset() {
  setVaultDeps({
    repo: new DexieVaultRepository(`v-${Math.random().toString(36).slice(2)}`),
  });
}

describe('vaultStore', () => {
  beforeEach(() => reset());

  it('init 无配置 → status=absent', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
    });
    expect(useVaultStore.getState().status).toBe('absent');
  });

  it('setup 成功 → status=unlocked，持有密钥', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useVaultStore.getState().setup('hunter2');
    });
    const s = useVaultStore.getState();
    expect(s.status).toBe('unlocked');
    expect(s.key).not.toBeNull();
  });

  it('lock 后清空主密钥', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useVaultStore.getState().setup('hunter2');
    });
    act(() => useVaultStore.getState().lock());
    const s = useVaultStore.getState();
    expect(s.status).toBe('locked');
    expect(s.key).toBeNull();
  });

  it('unlock 错误密码 → 抛错且 status 仍 locked', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useVaultStore.getState().setup('hunter2');
      useVaultStore.getState().lock();
    });
    await act(async () => {
      await expect(useVaultStore.getState().unlock('wrong')).rejects.toBeTruthy();
    });
    expect(useVaultStore.getState().status).toBe('locked');
  });

  it('unlock 正确密码 → 恢复 unlocked', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useVaultStore.getState().setup('hunter2');
      useVaultStore.getState().lock();
      await useVaultStore.getState().unlock('hunter2');
    });
    expect(useVaultStore.getState().status).toBe('unlocked');
  });

  it('init 已存在 enabled 配置 → status=locked', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useVaultStore.getState().setup('hunter2');
      // 模拟刷新页面：重新 init（保留 repo 但清空内存 key）
      useVaultStore.getState().lock();
      await useVaultStore.getState().init();
    });
    expect(useVaultStore.getState().status).toBe('locked');
  });

  it('disable 后 status=absent', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useVaultStore.getState().setup('hunter2');
      await useVaultStore.getState().disable();
    });
    expect(useVaultStore.getState().status).toBe('absent');
  });
});
