import { beforeEach, describe, expect, it } from 'vitest';
import { RemoteSyncError } from '@/domain/repositories/IRemoteSyncAdapter';
import { FileSystemSyncAdapter } from './fileSystemSyncAdapter';

/** 极简内存版 FileSystemDirectoryHandle 模拟，只覆盖 adapter 用到的方法 */
class FakeFileHandle {
  kind = 'file' as const;
  constructor(public name: string, public content: string, public lastModified = Date.now()) {}
  async getFile() {
    const c = this.content;
    return {
      lastModified: this.lastModified,
      size: c.length,
      text: async () => c,
    } as unknown as File;
  }
  async createWritable() {
    const self = this;
    return {
      write: async (data: string) => {
        self.content = data;
        self.lastModified = Date.now();
      },
      close: async () => {},
    } as unknown as FileSystemWritableFileStream;
  }
}

class FakeDirHandle {
  kind = 'directory' as const;
  files = new Map<string, FakeFileHandle>();
  subdirs = new Map<string, FakeDirHandle>();
  constructor(public name = 'root') {}

  async queryPermission() {
    return 'granted' as const;
  }
  async requestPermission() {
    return 'granted' as const;
  }

  async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
    let h = this.subdirs.get(name);
    if (!h) {
      if (!opts?.create) {
        throw Object.assign(new Error('NotFound'), { name: 'NotFoundError' });
      }
      h = new FakeDirHandle(name);
      this.subdirs.set(name, h);
    }
    return h as unknown as FileSystemDirectoryHandle;
  }

  async getFileHandle(name: string, opts?: { create?: boolean }) {
    let f = this.files.get(name);
    if (!f) {
      if (!opts?.create) {
        throw Object.assign(new Error('NotFound'), { name: 'NotFoundError' });
      }
      f = new FakeFileHandle(name, '');
      this.files.set(name, f);
    }
    return f as unknown as FileSystemFileHandle;
  }

  async removeEntry(name: string) {
    if (!this.files.has(name)) {
      throw Object.assign(new Error('NotFound'), { name: 'NotFoundError' });
    }
    this.files.delete(name);
  }

  // async iterator
  async *entries(): AsyncGenerator<[string, FakeFileHandle | FakeDirHandle]> {
    for (const [n, h] of this.files.entries()) yield [n, h];
    for (const [n, h] of this.subdirs.entries()) yield [n, h];
  }
}

describe('FileSystemSyncAdapter', () => {
  let dir: FakeDirHandle;
  let adapter: FileSystemSyncAdapter;

  beforeEach(() => {
    dir = new FakeDirHandle();
    adapter = new FileSystemSyncAdapter({
      dirHandle: dir as unknown as FileSystemDirectoryHandle,
    });
  });

  it('ping 已授权直接通过', async () => {
    await adapter.ping();
  });

  it('ping 未授权时 requestPermission 失败抛错', async () => {
    const bad = new FakeDirHandle();
    bad.queryPermission = async () => 'prompt' as never;
    bad.requestPermission = async () => 'denied' as never;
    const a = new FileSystemSyncAdapter({
      dirHandle: bad as unknown as FileSystemDirectoryHandle,
    });
    await expect(a.ping()).rejects.toBeInstanceOf(RemoteSyncError);
  });

  it('putFile 写入并 getFile 读回', async () => {
    await adapter.putFile('entries/abc.json', '{"hello":1}');
    const r = await adapter.getFile('entries/abc.json');
    expect(r).toBe('{"hello":1}');
  });

  it('文件落地为 .jdiary 后缀', async () => {
    await adapter.putFile('entries/abc.json', 'x');
    const sub = dir.subdirs.get('entries')!;
    expect(sub.files.has('abc.jdiary')).toBe(true);
  });

  it('getFile 不存在返回 null', async () => {
    expect(await adapter.getFile('entries/missing.json')).toBeNull();
  });

  it('listFiles 返回所有 .jdiary 文件', async () => {
    await adapter.putFile('entries/a.json', '1');
    await adapter.putFile('entries/b.json', '2');
    const list = await adapter.listFiles('entries/');
    expect(list.map((f) => f.path).sort()).toEqual([
      'entries/a.jdiary',
      'entries/b.jdiary',
    ]);
  });

  it('deleteFile 移除文件', async () => {
    await adapter.putFile('entries/a.json', '1');
    await adapter.deleteFile('entries/a.json');
    expect(await adapter.getFile('entries/a.json')).toBeNull();
  });

  it('deleteFile 不存在视为成功', async () => {
    await adapter.deleteFile('entries/never.json');
  });

  it('非法 path 在 getFile 时返回 null', async () => {
    expect(await adapter.getFile('weird-path')).toBeNull();
  });

  it('非法 path 在 putFile 时抛错', async () => {
    await expect(adapter.putFile('weird', 'x')).rejects.toBeInstanceOf(
      RemoteSyncError,
    );
  });
});
