import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DexieEntryRepository } from '@/infrastructure/persistence/dexieEntryRepository';
import { createEntryUseCase } from '../createEntry';
import { deleteEntryUseCase } from '../deleteEntry';
import { listEntriesUseCase } from '../listEntries';
import { EntryNotFoundError, updateEntryUseCase } from '../updateEntry';

describe('Entry usecases', () => {
  let repo: DexieEntryRepository;
  beforeEach(() => {
    repo = new DexieEntryRepository(`uc-${Math.random().toString(36).slice(2)}`);
  });

  it('createEntryUseCase 持久化新条目', async () => {
    const e = await createEntryUseCase({ entryRepo: repo }, { title: '今日' });
    const got = await repo.get(e.id);
    expect(got?.title).toBe('今日');
  });

  it('updateEntryUseCase 修改现有条目', async () => {
    const e = await createEntryUseCase({ entryRepo: repo }, { title: 'a', now: 1000 });
    const upd = await updateEntryUseCase({ entryRepo: repo }, e.id, {
      title: 'b',
      now: 2000,
    });
    expect(upd.title).toBe('b');
    const r = await repo.get(e.id);
    expect(r?.title).toBe('b');
  });

  it('updateEntryUseCase 找不到则抛 EntryNotFoundError', async () => {
    await expect(
      updateEntryUseCase({ entryRepo: repo }, 'missing' as never, { title: 'x' }),
    ).rejects.toBeInstanceOf(EntryNotFoundError);
  });

  it('deleteEntryUseCase 删除条目', async () => {
    const e = await createEntryUseCase({ entryRepo: repo });
    await deleteEntryUseCase({ entryRepo: repo }, e.id);
    expect(await repo.get(e.id)).toBeNull();
  });

  it('listEntriesUseCase 返回倒序列表', async () => {
    await createEntryUseCase({ entryRepo: repo }, { title: '1', now: 1000 });
    await createEntryUseCase({ entryRepo: repo }, { title: '2', now: 2000 });
    const list = await listEntriesUseCase({ entryRepo: repo });
    expect(list.map((e) => e.title)).toEqual(['2', '1']);
  });
});
