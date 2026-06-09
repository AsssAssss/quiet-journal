import {
  type IRemoteSyncAdapter,
  type RemoteFileEntry,
  RemoteSyncError,
} from '@/domain/repositories/IRemoteSyncAdapter';
import { logger } from '@/shared/logger';

/**
 * 用户首次选择的本地目录的 handle。我们直接复用 File System Access API。
 * 仅 Chromium 系桌面浏览器与 Android Chrome 14+ 支持。
 */
export interface FileSystemSyncOpts {
  dirHandle: FileSystemDirectoryHandle;
}

/**
 * 把 IRemoteSyncAdapter 实现到"用户选定的本地目录"上。
 *
 * 设计：每条 entry 对应目录里一个文件 `<entryId>.jdiary`。
 * 与 syncEntries 用例 100% 兼容——它只通过端口看到 5 个方法，
 * 不感知背后是 WebDAV、PocketBase 还是本地目录。
 */
export class FileSystemSyncAdapter implements IRemoteSyncAdapter {
  private readonly dir: FileSystemDirectoryHandle;
  /** 同步目录下的子目录，对应 syncEntries 用的 "entries/" 前缀 */
  private static readonly SUBDIR = 'entries';

  constructor(opts: FileSystemSyncOpts) {
    this.dir = opts.dirHandle;
  }

  async ping(): Promise<void> {
    // 验证权限
    const perm = await this.dir.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const next = await this.dir.requestPermission({ mode: 'readwrite' });
      if (next !== 'granted') {
        throw new RemoteSyncError('没有目录读写权限');
      }
    }
    logger.debug({ feature: 'fs-sync', action: 'ping_ok' });
  }

  async listFiles(_prefix?: string): Promise<RemoteFileEntry[]> {
    const subdir = await this.ensureSubdir();
    const out: RemoteFileEntry[] = [];
    // FileSystemDirectoryHandle 支持 async iteration
    for await (const [name, handle] of subdir.entries()) {
      if (handle.kind !== 'file') continue;
      if (!name.endsWith('.jdiary')) continue;
      const file = await (handle as FileSystemFileHandle).getFile();
      out.push({
        path: `${FileSystemSyncAdapter.SUBDIR}/${name}`,
        modifiedAt: file.lastModified,
        size: file.size,
      });
    }
    return out;
  }

  async getFile(path: string): Promise<string | null> {
    const fileName = parseFileName(path);
    if (!fileName) return null;
    try {
      const subdir = await this.ensureSubdir();
      const fh = await subdir.getFileHandle(fileName);
      const file = await fh.getFile();
      return await file.text();
    } catch (e) {
      if ((e as DOMException).name === 'NotFoundError') return null;
      throw new RemoteSyncError(`read failed: ${(e as Error).message}`);
    }
  }

  async putFile(path: string, body: string): Promise<void> {
    const fileName = parseFileName(path);
    if (!fileName) throw new RemoteSyncError('非法路径');
    const subdir = await this.ensureSubdir();
    const fh = await subdir.getFileHandle(fileName, { create: true });
    const stream = await fh.createWritable();
    await stream.write(body);
    await stream.close();
  }

  async deleteFile(path: string): Promise<void> {
    const fileName = parseFileName(path);
    if (!fileName) return;
    try {
      const subdir = await this.ensureSubdir();
      await subdir.removeEntry(fileName);
    } catch (e) {
      if ((e as DOMException).name === 'NotFoundError') return;
      throw new RemoteSyncError(`delete failed: ${(e as Error).message}`);
    }
  }

  /** 转换 'entries/abc.jdiary' 或 'entries/abc.json' → 文件名 */
  private async ensureSubdir(): Promise<FileSystemDirectoryHandle> {
    return this.dir.getDirectoryHandle(FileSystemSyncAdapter.SUBDIR, {
      create: true,
    });
  }
}

/**
 * `syncEntries` 用例发出的路径是 `entries/<id>.json`。
 * 我们在本地落地为 `entries/<id>.jdiary`，与 WebDAV 路径里 .jdiary 的设计一致。
 */
function parseFileName(path: string): string | null {
  // entries/abc.json → abc.jdiary
  const m = path.match(/^entries\/(.+?)(?:\.json|\.jdiary)?$/);
  if (!m) return null;
  return `${m[1]}.jdiary`;
}

/** 是否支持 File System Access API（用于 UI 判断） */
export function isFileSystemSyncSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as Window & { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      'function'
  );
}
