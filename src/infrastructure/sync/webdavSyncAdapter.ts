import {
  type IRemoteSyncAdapter,
  type RemoteFileEntry,
  RemoteSyncError,
} from '@/domain/repositories/IRemoteSyncAdapter';
import { logger } from '@/shared/logger';

export interface WebDavConfig {
  /** 形如 https://dav.example.com/quiet/ ，结尾的 / 可省略 */
  baseUrl: string;
  username: string;
  password: string;
}

/**
 * 极简 WebDAV 客户端：仅用浏览器原生 fetch + Basic Auth。
 * 注意：浏览器直连 WebDAV 通常受 CORS 限制，需后端开启相应跨域响应头。
 */
export class WebdavSyncAdapter implements IRemoteSyncAdapter {
  private readonly base: string;
  private readonly authHeader: string;

  constructor(cfg: WebDavConfig) {
    this.base = normalizeBase(cfg.baseUrl);
    this.authHeader = 'Basic ' + btoa(`${cfg.username}:${cfg.password}`);
  }

  private url(path: string): string {
    const clean = path.replace(/^\/+/, '');
    return this.base + clean;
  }

  private headers(extra: Record<string, string> = {}): HeadersInit {
    return { Authorization: this.authHeader, ...extra };
  }

  async ping(): Promise<void> {
    const res = await fetch(this.url(''), {
      method: 'PROPFIND',
      headers: this.headers({ Depth: '0' }),
    });
    if (!res.ok && res.status !== 207) {
      throw new RemoteSyncError(`ping 失败 (${res.status})`, res.status);
    }
    logger.debug({ feature: 'webdav', action: 'ping', resp: { status: res.status } });
  }

  async listFiles(prefix = ''): Promise<RemoteFileEntry[]> {
    const url = this.url(prefix);
    const res = await fetch(url, {
      method: 'PROPFIND',
      headers: this.headers({ Depth: '1', 'Content-Type': 'application/xml' }),
    });
    if (!res.ok && res.status !== 207) {
      throw new RemoteSyncError(`list 失败 (${res.status})`, res.status);
    }
    const text = await res.text();
    return parseMultiStatus(text, this.base, prefix);
  }

  async getFile(path: string): Promise<string | null> {
    const res = await fetch(this.url(path), {
      method: 'GET',
      headers: this.headers(),
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new RemoteSyncError(`get 失败 (${res.status})`, res.status);
    }
    return res.text();
  }

  async putFile(path: string, body: string): Promise<void> {
    // 确保目录存在（一次性尝试 MKCOL，忽略已存在错误）
    await this.ensureDir(path);
    const res = await fetch(this.url(path), {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': 'application/json; charset=utf-8' }),
      body,
    });
    if (!res.ok && res.status !== 201 && res.status !== 204) {
      throw new RemoteSyncError(`put 失败 (${res.status})`, res.status);
    }
  }

  async deleteFile(path: string): Promise<void> {
    const res = await fetch(this.url(path), {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!res.ok && res.status !== 404 && res.status !== 204) {
      throw new RemoteSyncError(`delete 失败 (${res.status})`, res.status);
    }
  }

  private async ensureDir(path: string): Promise<void> {
    const parts = path.split('/');
    parts.pop(); // 去掉文件名
    if (parts.length === 0) return;
    let cur = '';
    for (const p of parts) {
      cur += p + '/';
      try {
        await fetch(this.url(cur), { method: 'MKCOL', headers: this.headers() });
      } catch {
        // 忽略
      }
    }
  }
}

function normalizeBase(raw: string): string {
  let s = raw.trim();
  if (!s.endsWith('/')) s += '/';
  return s;
}

/** 解析 PROPFIND 207 响应（兼容大多数 WebDAV 服务） */
export function parseMultiStatus(
  xml: string,
  base: string,
  prefix: string,
): RemoteFileEntry[] {
  if (!xml) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const responses = doc.getElementsByTagNameNS('*', 'response');
  const out: RemoteFileEntry[] = [];
  const basePath = new URL(base).pathname;
  const prefixPath = prefix.replace(/^\/+/, '');
  const dirPath = (basePath + prefixPath).replace(/\/+$/, '/');

  for (let i = 0; i < responses.length; i++) {
    const r = responses[i]!;
    const hrefEl = r.getElementsByTagNameNS('*', 'href')[0];
    if (!hrefEl?.textContent) continue;
    let href: string;
    try {
      href = decodeURIComponent(hrefEl.textContent.trim());
    } catch {
      href = hrefEl.textContent.trim();
    }
    // 跳过目录本身
    if (href === dirPath || href + '/' === dirPath || href === basePath) continue;

    const isCollection =
      r.getElementsByTagNameNS('*', 'collection').length > 0 || href.endsWith('/');
    if (isCollection) continue;

    const lastModEl = r.getElementsByTagNameNS('*', 'getlastmodified')[0];
    const modifiedAt = lastModEl?.textContent
      ? Date.parse(lastModEl.textContent)
      : Date.now();
    const sizeEl = r.getElementsByTagNameNS('*', 'getcontentlength')[0];
    const size = sizeEl?.textContent ? Number(sizeEl.textContent) : undefined;

    // 把 path 还原成相对 base 的路径
    let path = href;
    if (path.startsWith(basePath)) path = path.slice(basePath.length);
    out.push({ path, modifiedAt, size });
  }
  return out;
}
