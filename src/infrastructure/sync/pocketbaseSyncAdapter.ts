import {
  type IRemoteSyncAdapter,
  type RemoteFileEntry,
  RemoteSyncError,
} from '@/domain/repositories/IRemoteSyncAdapter';
import { logger } from '@/shared/logger';

export interface PocketBaseConfig {
  /** 形如 https://quiet-api.example.com（无尾斜杠也接受） */
  baseUrl: string;
  /** PB authStore 中的 token；空字符串表示未登录（ping 不依赖） */
  token: string;
  /** 当前已登录用户的 PB record id；putFile 时写入 user 字段 */
  userId: string;
}

/**
 * 把 5 个文件操作端口映射到 PocketBase REST。
 * 远端"路径"规则保持与 WebDAV 适配器一致：`entries/<entryId>.json`。
 */
export class PocketBaseSyncAdapter implements IRemoteSyncAdapter {
  private readonly base: string;
  private readonly token: string;
  private readonly userId: string;

  constructor(cfg: PocketBaseConfig) {
    this.base = cfg.baseUrl.trim().replace(/\/+$/, '');
    this.token = cfg.token;
    this.userId = cfg.userId;
  }

  private headers(extra: Record<string, string> = {}): HeadersInit {
    const h: Record<string, string> = { ...extra };
    if (this.token) h.Authorization = this.token;
    return h;
  }

  async ping(): Promise<void> {
    const res = await fetch(`${this.base}/api/health`, {
      method: 'GET',
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new RemoteSyncError(`ping 失败 (${res.status})`, res.status);
    }
    logger.debug({ feature: 'pb', action: 'ping' });
  }

  async listFiles(_prefix?: string): Promise<RemoteFileEntry[]> {
    if (!this.token || !this.userId) {
      throw new RemoteSyncError('未登录', 401);
    }
    // PocketBase 支持 perPage 上限 500
    const url = new URL(`${this.base}/api/collections/entries/records`);
    url.searchParams.set('perPage', '500');
    url.searchParams.set('fields', 'id,entry_updated_at,updated');
    url.searchParams.set('filter', `user = "${this.userId}"`);

    const out: RemoteFileEntry[] = [];
    let page = 1;
    // 翻页累计（一般个人日记 ≤ 几千条，最多翻几页）
    // eslint-disable-next-line no-constant-condition
    while (true) {
      url.searchParams.set('page', String(page));
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: this.headers(),
      });
      if (!res.ok) {
        throw new RemoteSyncError(`list 失败 (${res.status})`, res.status);
      }
      const body = (await res.json()) as PbListResponse;
      for (const item of body.items) {
        out.push({
          path: `entries/${item.id}.json`,
          modifiedAt: item.entry_updated_at,
        });
      }
      if (body.page >= body.totalPages || body.items.length === 0) break;
      page++;
      if (page > 50) break; // 安全阀
    }
    return out;
  }

  async getFile(path: string): Promise<string | null> {
    const id = idOf(path);
    if (!id) return null;
    if (!this.token) throw new RemoteSyncError('未登录', 401);
    const res = await fetch(
      `${this.base}/api/collections/entries/records/${encodeURIComponent(id)}`,
      { method: 'GET', headers: this.headers() },
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new RemoteSyncError(`get 失败 (${res.status})`, res.status);
    }
    const rec = (await res.json()) as PbRecord;
    return rec.payload ?? null;
  }

  async putFile(path: string, body: string): Promise<void> {
    const id = idOf(path);
    if (!id) throw new RemoteSyncError('非法路径');
    if (!this.token || !this.userId) {
      throw new RemoteSyncError('未登录', 401);
    }
    // 解析 body 中的 updatedAt，写到 PB 字段（用于 list 时排序/比较）
    let entry_updated_at = Date.now();
    try {
      const parsed = JSON.parse(body) as { updatedAt?: number };
      if (typeof parsed.updatedAt === 'number') entry_updated_at = parsed.updatedAt;
    } catch {
      /* 保持默认 */
    }

    const recordBody = JSON.stringify({
      id,
      user: this.userId,
      payload: body,
      entry_updated_at,
    });

    // 先尝试 PATCH（已存在的更新）；若 404 则 POST 新建
    const patchRes = await fetch(
      `${this.base}/api/collections/entries/records/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: recordBody,
      },
    );
    if (patchRes.ok) return;
    if (patchRes.status === 404) {
      const postRes = await fetch(
        `${this.base}/api/collections/entries/records`,
        {
          method: 'POST',
          headers: this.headers({ 'Content-Type': 'application/json' }),
          body: recordBody,
        },
      );
      if (!postRes.ok) {
        throw new RemoteSyncError(`put 失败 (${postRes.status})`, postRes.status);
      }
      return;
    }
    throw new RemoteSyncError(`put 失败 (${patchRes.status})`, patchRes.status);
  }

  async deleteFile(path: string): Promise<void> {
    const id = idOf(path);
    if (!id) return;
    const res = await fetch(
      `${this.base}/api/collections/entries/records/${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: this.headers() },
    );
    if (res.status === 404 || res.status === 204) return;
    if (!res.ok) {
      throw new RemoteSyncError(`delete 失败 (${res.status})`, res.status);
    }
  }
}

function idOf(path: string): string | null {
  const m = path.match(/^entries\/(.+)\.json$/);
  return m ? m[1]! : null;
}

interface PbListResponse {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: { id: string; entry_updated_at: number; updated: string }[];
}

interface PbRecord {
  id: string;
  user: string;
  payload: string;
  entry_updated_at: number;
}
