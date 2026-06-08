import 'fake-indexeddb/auto';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('unlock 失败累加 failedAttempts', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useVaultStore.getState().setup('hunter2');
      useVaultStore.getState().lock();
    });
    await act(async () => {
      await expect(useVaultStore.getState().unlock('wrong1')).rejects.toBeTruthy();
      await expect(useVaultStore.getState().unlock('wrong2')).rejects.toBeTruthy();
    });
    expect(useVaultStore.getState().failedAttempts).toBe(2);
    expect(useVaultStore.getState().lockoutUntil).toBeNull();
  });

  it('5 次失败触发冷却', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useVaultStore.getState().setup('hunter2');
      useVaultStore.getState().lock();
    });
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await expect(useVaultStore.getState().unlock('bad')).rejects.toBeTruthy();
      });
    }
    expect(useVaultStore.getState().failedAttempts).toBe(5);
    expect(useVaultStore.getState().lockoutUntil).not.toBeNull();
  });

  it('冷却中再 unlock 直接抛错（不增加 failedAttempts）', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useVaultStore.getState().setup('hunter2');
      useVaultStore.getState().lock();
    });
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await expect(useVaultStore.getState().unlock('bad')).rejects.toBeTruthy();
      });
    }
    const before = useVaultStore.getState().failedAttempts;
    await act(async () => {
      await expect(
        useVaultStore.getState().unlock('hunter2'),
      ).rejects.toBeTruthy();
    });
    expect(useVaultStore.getState().failedAttempts).toBe(before);
  });

  it('成功 unlock 清零 failedAttempts 与 lockoutUntil', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useVaultStore.getState().setup('hunter2');
      useVaultStore.getState().lock();
    });
    await act(async () => {
      await expect(useVaultStore.getState().unlock('bad')).rejects.toBeTruthy();
    });
    // 此时 lockoutUntil 仍是 null（<5 次），直接成功解锁应清零
    await act(async () => {
      await useVaultStore.getState().unlock('hunter2');
    });
    expect(useVaultStore.getState().failedAttempts).toBe(0);
    expect(useVaultStore.getState().lockoutUntil).toBeNull();
  });

  it('resetVault 清空条目并 disable', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useVaultStore.getState().setup('hunter2');
    });
    const wipe = vi.fn(async () => {});
    await act(async () => {
      await useVaultStore.getState().resetVault(wipe);
    });
    expect(wipe).toHaveBeenCalled();
    const s = useVaultStore.getState();
    expect(s.status).toBe('absent');
    expect(s.failedAttempts).toBe(0);
    expect(s.lockoutUntil).toBeNull();
  });
});
