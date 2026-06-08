/**
 * 远端同步适配器（WebDAV / S3 / 本地文件夹...通用抽象）。
 * 这里把"远端"简化为一个键值文件存储：
 *   - putFile(path, body)
 *   - getFile(path)
 *   - deleteFile(path)
 *   - listFiles(prefix)
 */

export interface RemoteFileEntry {
  /** 完整路径，例如 'entries/abc.json' */
  path: string;
  /** 最后修改时间，毫秒 */
  modifiedAt: number;
  size?: number;
}

export interface IRemoteSyncAdapter {
  /** 连通性 / 凭证测试 */
  ping(): Promise<void>;
  listFiles(prefix?: string): Promise<RemoteFileEntry[]>;
  getFile(path: string): Promise<string | null>;
  putFile(path: string, body: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
}

export class RemoteSyncError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'RemoteSyncError';
  }
}
