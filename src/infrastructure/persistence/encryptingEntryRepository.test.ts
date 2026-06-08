import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEntry, updateEntry } from '@/domain/entities/Entry';
import { WebCryptoEncryptionService } from '@/infrastructure/crypto/webCryptoEncryptionService';
import { DexieEntryRepository } from './dexieEntryRepository';
import {
  EncryptingEntryRepository,
  VaultLockedError,
} from './encryptingEntryRepository';

async function makeRepo(unlocked = true) {
  const inner = new DexieEntryRepository(`enc-${Math.random().toString(36).slice(2)}`);
  const crypto = new WebCryptoEncryptionService();
  const salt = crypto.newSalt();
  const key = await crypto.deriveKey('pwd', salt, 10_000);
  return {
    inner,
    crypto,
    key,
    repo: new EncryptingEntryRepository({
      inner,
      crypto,
      keyProvider: () => (unlocked ? key : null),
    }),
  };
}

describe('EncryptingEntryRepository', () => {
  let env: Awaited<ReturnType<typeof makeRepo>>;
  beforeEach(async () => {
    env = await makeRepo();
  });

  it('save 后底层存的不再是明文', async () => {
    const e = updateEntry(createEntry({ title: '秘密', now: 1 }), {
      plainText: '今天写了密码',
      now: 2,
    });
    await env.repo.save(e);
    const raw = await env.inner.get(e.id);
    expect(raw?.title).toBe('');
    expect(raw?.plainText).toBe('');
    expect((raw?.contentJson as { __cipher?: unknown })?.__cipher).toBeDefined();
  });

  it('get 自动解密回原文', async () => {
    const e = updateEntry(createEntry({ title: '秘密', now: 1 }), {
      plainText: '今天写了密码',
      now: 2,
    });
    await env.repo.save(e);
    const back = await env.repo.get(e.id);
    expect(back?.title).toBe('秘密');
    expect(back?.plainText).toBe('今天写了密码');
  });

  it('list 自动解密', async () => {
    const e1 = updateEntry(createEntry({ title: 'a', now: 1000 }), {
      plainText: 'A',
      now: 1100,
    });
    const e2 = updateEntry(createEntry({ title: 'b', now: 2000 }), {
      plainText: 'B',
      now: 2100,
    });
    await env.repo.save(e1);
    await env.repo.save(e2);
    const list = await env.repo.list();
    expect(list.map((e) => e.title).sort()).toEqual(['a', 'b']);
  });

  it('元数据（mood/tags/createdAt）不加密 —— 可用于筛选', async () => {
    const e = updateEntry(createEntry({ title: 't', now: 1 }), {
      mood: 5,
      tags: ['工作'],
      now: 2,
    });
    await env.repo.save(e);
    const raw = await env.inner.get(e.id);
    expect(raw?.mood).toBe(5);
    expect(raw?.tags).toEqual(['工作']);
  });

  it('锁定状态下 save/get 抛 VaultLockedError', async () => {
    const locked = new EncryptingEntryRepository({
      inner: env.inner,
      crypto: env.crypto,
      keyProvider: () => null,
    });
    // 先用解锁的 repo 写入一条
    const e = createEntry({ title: 't' });
    await env.repo.save(e);
    await expect(locked.get(e.id)).rejects.toBeInstanceOf(VaultLockedError);
    await expect(locked.save(createEntry({ title: 'x' }))).rejects.toBeInstanceOf(
      VaultLockedError,
    );
  });

  it('delete / countByDay 不需要 key，锁定时也可', async () => {
    const e = createEntry({
      title: 't',
      now: new Date(2026, 5, 1, 9).getTime(),
    });
    await env.repo.save(e);
    const locked = new EncryptingEntryRepository({
      inner: env.inner,
      crypto: env.crypto,
      keyProvider: () => null,
    });
    const counts = await locked.countByDay({ year: 2026, month: 6 });
    expect(counts['2026-06-01']).toBe(1);
    await locked.delete(e.id);
    expect(await env.inner.get(e.id)).toBeNull();
  });
});
