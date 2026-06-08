import 'fake-indexeddb/auto';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DexieEntryRepository } from '@/infrastructure/persistence/dexieEntryRepository';
import { setEntryRepo, useEntryStore } from './entryStore';

function freshRepo() {
  return new DexieEntryRepository(`store-${Math.random().toString(36).slice(2)}`);
}

describe('entryStore', () => {
  beforeEach(() => {
    setEntryRepo(freshRepo());
  });

  it('load 在空库返回空数组并标记 loaded', async () => {
    await act(async () => {
      await useEntryStore.getState().load();
    });
    expect(useEntryStore.getState().loaded).toBe(true);
    expect(useEntryStore.getState().entries).toEqual([]);
  });

  it('create 后 entries 头部新增', async () => {
    await act(async () => {
      await useEntryStore.getState().create();
    });
    expect(useEntryStore.getState().entries).toHaveLength(1);
  });

  it('update 改写指定 entry', async () => {
    const created = await useEntryStore.getState().create();
    await act(async () => {
      await useEntryStore.getState().update(created.id, { title: '新' });
    });
    expect(useEntryStore.getState().entries[0]!.title).toBe('新');
  });

  it('remove 从 entries 移除', async () => {
    const created = await useEntryStore.getState().create();
    await act(async () => {
      await useEntryStore.getState().remove(created.id);
    });
    expect(useEntryStore.getState().entries).toHaveLength(0);
  });

  it('load 抛错时设置 error', async () => {
    setEntryRepo({
      get: async () => null,
      list: async () => {
        throw new Error('boom');
      },
      save: async () => {},
      delete: async () => {},
      countByDay: async () => ({}),
    });
    await act(async () => {
      await useEntryStore.getState().load();
    });
    expect(useEntryStore.getState().error).toBe('boom');
  });
});
