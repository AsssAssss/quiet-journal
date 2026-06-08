import 'fake-indexeddb/auto';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DexieEntryRepository } from '@/infrastructure/persistence/dexieEntryRepository';
import { DexieVaultRepository } from '@/infrastructure/persistence/dexieVaultRepository';
import { setVaultDeps, useVaultStore } from './vaultStore';
import {
  migrateBaseToEncrypted,
  migrateEncryptedToBase,
  reloadEntries,
  setEntryRepo,
  useEntryStore,
} from './entryStore';

describe('entryStore migration', () => {
  let baseRepo: DexieEntryRepository;
  beforeEach(() => {
    baseRepo = new DexieEntryRepository(`mig-${Math.random().toString(36).slice(2)}`);
    setEntryRepo(baseRepo);
    setVaultDeps({
      repo: new DexieVaultRepository(`mvault-${Math.random().toString(36).slice(2)}`),
    });
  });

  it('启用 vault 后旧明文条目被加密；重新读取仍是原文', async () => {
    // 1) 明文状态下写一条
    await act(async () => {
      await useVaultStore.getState().init();
      await useEntryStore.getState().load();
      await useEntryStore.getState().create();
    });
    const created = useEntryStore.getState().entries[0]!;
    await act(async () => {
      await useEntryStore.getState().update(created.id, {
        title: '机密',
        plainText: '不能让别人看到',
      });
    });

    // 验证此时底层是明文
    const rawBefore = await baseRepo.get(created.id);
    expect(rawBefore?.title).toBe('机密');

    // 2) 开启 vault
    await act(async () => {
      await useVaultStore.getState().setup('hunter2');
      await migrateBaseToEncrypted();
      await reloadEntries();
    });

    // 底层应该是密文
    const rawAfter = await baseRepo.get(created.id);
    expect(rawAfter?.title).toBe('');
    expect((rawAfter?.contentJson as { __cipher?: unknown })?.__cipher).toBeDefined();

    // store 中仍是原文（解密返回）
    const reloaded = useEntryStore.getState().entries.find((e) => e.id === created.id);
    expect(reloaded?.title).toBe('机密');
    expect(reloaded?.plainText).toBe('不能让别人看到');
  });

  it('关闭 vault 后底层回写为明文', async () => {
    await act(async () => {
      await useVaultStore.getState().init();
      await useEntryStore.getState().load();
      await useEntryStore.getState().create();
    });
    const created = useEntryStore.getState().entries[0]!;
    await act(async () => {
      await useEntryStore.getState().update(created.id, {
        title: '机密',
        plainText: '正文',
      });
      await useVaultStore.getState().setup('hunter2');
      await migrateBaseToEncrypted();
      await reloadEntries();
    });

    // 关闭并迁回明文
    await act(async () => {
      await migrateEncryptedToBase();
      await useVaultStore.getState().disable();
      await reloadEntries();
    });

    const rawBack = await baseRepo.get(created.id);
    expect(rawBack?.title).toBe('机密');
    expect(rawBack?.plainText).toBe('正文');
  });
});
