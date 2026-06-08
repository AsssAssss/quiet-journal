import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEntry, updateEntry } from '@/domain/entities/Entry';
import { DexieEntryRepository } from './dexieEntryRepository';

function makeRepo() {
  // 每个测试一个独立的 db 名，避免相互污染
  return new DexieEntryRepository(`test-${Math.random().toString(36).slice(2)}`);
}

describe('DexieEntryRepository', () => {
  let repo: DexieEntryRepository;
  beforeEach(() => {
    repo = makeRepo();
  });

  it('save 后能 get 回相同对象', async () => {
    const e = createEntry({ title: 'hello', tags: ['日记'], now: 1000 });
    await repo.save(e);
    const r = await repo.get(e.id);
    expect(r).toEqual(e);
  });

  it('get 不存在返回 null', async () => {
    const r = await repo.get('nope' as never);
    expect(r).toBeNull();
  });

  it('list 默认按 createdAt 倒序', async () => {
    const a = createEntry({ title: 'a', now: 1000 });
    const b = createEntry({ title: 'b', now: 2000 });
    const c = createEntry({ title: 'c', now: 3000 });
    await repo.save(a);
    await repo.save(b);
    await repo.save(c);
    const list = await repo.list();
    expect(list.map((e) => e.title)).toEqual(['c', 'b', 'a']);
  });

  it('list 支持 from/to 过滤', async () => {
    const a = createEntry({ title: 'a', now: 1000 });
    const b = createEntry({ title: 'b', now: 2000 });
    const c = createEntry({ title: 'c', now: 3000 });
    for (const e of [a, b, c]) await repo.save(e);
    const list = await repo.list({ from: 1500, to: 2500 });
    expect(list.map((e) => e.title)).toEqual(['b']);
  });

  it('list 支持 tag 过滤', async () => {
    const a = createEntry({ title: 'a', tags: ['工作'], now: 1000 });
    const b = createEntry({ title: 'b', tags: ['生活'], now: 2000 });
    await repo.save(a);
    await repo.save(b);
    const list = await repo.list({ tag: '生活' });
    expect(list.map((e) => e.title)).toEqual(['b']);
  });

  it('list 支持 limit', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.save(createEntry({ title: `t${i}`, now: i * 100 }));
    }
    const list = await repo.list({ limit: 2 });
    expect(list).toHaveLength(2);
  });

  it('save 同 id 等同于覆盖', async () => {
    const e = createEntry({ title: '一', now: 1000 });
    await repo.save(e);
    const e2 = updateEntry(e, { title: '二', now: 2000 });
    await repo.save(e2);
    const r = await repo.get(e.id);
    expect(r?.title).toBe('二');
  });

  it('delete 后 get 返回 null', async () => {
    const e = createEntry({ title: 'x' });
    await repo.save(e);
    await repo.delete(e.id);
    expect(await repo.get(e.id)).toBeNull();
  });

  it('countByDay 按天计数', async () => {
    const t1 = new Date(2026, 5, 1, 9, 0).getTime();
    const t2 = new Date(2026, 5, 1, 23, 0).getTime();
    const t3 = new Date(2026, 5, 3, 12, 0).getTime();
    const tOther = new Date(2026, 6, 5).getTime();
    for (const t of [t1, t2, t3, tOther]) {
      await repo.save(createEntry({ title: 't', now: t }));
    }
    const counts = await repo.countByDay({ year: 2026, month: 6 });
    expect(counts['2026-06-01']).toBe(2);
    expect(counts['2026-06-03']).toBe(1);
    expect(counts['2026-07-05']).toBeUndefined();
  });
});
