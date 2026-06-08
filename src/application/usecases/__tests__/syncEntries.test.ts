import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEntry, updateEntry } from '@/domain/entities/Entry';
import type {
  IRemoteSyncAdapter,
  RemoteFileEntry,
} from '@/domain/repositories/IRemoteSyncAdapter';
import { DexieEntryRepository } from '@/infrastructure/persistence/dexieEntryRepository';
import { syncEntries } from '../syncEntries';

class FakeRemote implements IRemoteSyncAdapter {
  files = new Map<string, string>();
  async ping() {}
  async listFiles(prefix = ''): Promise<RemoteFileEntry[]> {
    return Array.from(this.files.keys())
      .filter((k) => k.startsWith(prefix))
      .map((path) => ({ path, modifiedAt: Date.now() }));
  }
  async getFile(path: string) {
    return this.files.get(path) ?? null;
  }
  async putFile(path: string, body: string) {
    this.files.set(path, body);
  }
  async deleteFile(path: string) {
    this.files.delete(path);
  }
}

function makeRepo() {
  return new DexieEntryRepository(`sync-${Math.random().toString(36).slice(2)}`);
}

describe('syncEntries', () => {
  let local: DexieEntryRepository;
  let remote: FakeRemote;
  beforeEach(() => {
    local = makeRepo();
    remote = new FakeRemote();
  });

  it('空两端 → 0 改动', async () => {
    const r = await syncEntries({ local, remote });
    expect(r).toMatchObject({ uploaded: 0, downloaded: 0 });
  });

  it('仅本地有 → 上传', async () => {
    const e = createEntry({ title: '本地' });
    await local.save(e);
    const r = await syncEntries({ local, remote });
    expect(r.uploaded).toBe(1);
    expect(remote.files.has(`entries/${e.id}.json`)).toBe(true);
  });

  it('仅远端有 → 下载', async () => {
    const e = createEntry({ title: '远端' });
    remote.files.set(
      `entries/${e.id}.json`,
      JSON.stringify({ entry: e, updatedAt: e.updatedAt }),
    );
    const r = await syncEntries({ local, remote });
    expect(r.downloaded).toBe(1);
    expect((await local.get(e.id))?.title).toBe('远端');
  });

  it('本地更新更晚 → 上传覆盖远端', async () => {
    const e = createEntry({ title: 'a', now: 1000 });
    const remoteEntry = e;
    remote.files.set(
      `entries/${e.id}.json`,
      JSON.stringify({ entry: remoteEntry, updatedAt: remoteEntry.updatedAt }),
    );
    const newer = updateEntry(e, { title: 'a2', now: 3000 });
    await local.save(newer);
    const r = await syncEntries({ local, remote });
    expect(r.uploaded).toBe(1);
    expect(r.downloaded).toBe(0);
    const back = JSON.parse(remote.files.get(`entries/${e.id}.json`)!);
    expect(back.entry.title).toBe('a2');
  });

  it('远端更新更晚 → 下载覆盖本地', async () => {
    const e = createEntry({ title: 'a', now: 1000 });
    await local.save(e);
    const newer = updateEntry(e, { title: 'a-newer', now: 5000 });
    remote.files.set(
      `entries/${e.id}.json`,
      JSON.stringify({ entry: newer, updatedAt: newer.updatedAt }),
    );
    const r = await syncEntries({ local, remote });
    expect(r.downloaded).toBe(1);
    expect((await local.get(e.id))?.title).toBe('a-newer');
  });

  it('updatedAt 相等 → 不动', async () => {
    const e = createEntry({ title: 'same', now: 1234 });
    await local.save(e);
    remote.files.set(
      `entries/${e.id}.json`,
      JSON.stringify({ entry: e, updatedAt: e.updatedAt }),
    );
    const r = await syncEntries({ local, remote });
    expect(r.uploaded).toBe(0);
    expect(r.downloaded).toBe(0);
  });

  it('损坏的远端 JSON 被跳过', async () => {
    const e = createEntry({ title: 'broken' });
    remote.files.set(`entries/${e.id}.json`, '{not-json');
    const r = await syncEntries({ local, remote });
    expect(r.downloaded).toBe(0);
  });
});
