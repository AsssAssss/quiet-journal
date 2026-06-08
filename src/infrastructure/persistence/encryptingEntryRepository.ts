import type { Entry } from '@/domain/entities/Entry';
import type {
  EntryListFilter,
  IEntryRepository,
} from '@/domain/repositories/IEntryRepository';
import type { IEncryptionService } from '@/domain/services/IEncryptionService';
import type { EncryptedBlob } from '@/domain/valueObjects/EncryptedBlob';
import type { EntryId } from '@/domain/valueObjects/EntryId';
import { logger } from '@/shared/logger';

/**
 * 加密装饰器：包装一个底层 IEntryRepository（明文存储），
 * 在 save 时把 entry 的敏感字段（title/contentJson/plainText/weather）加密成单个 blob 存进 _encrypted 字段。
 * 读取时若 _encrypted 存在，则用主密钥解密并恢复字段。
 *
 * 用 `keyProvider` 而不是直接传 key —— 锁定后 key 失效，由上层抛 VaultLockedError。
 */
export interface EncryptingEntryRepoOpts {
  inner: IEntryRepository;
  crypto: IEncryptionService;
  /** 当前主密钥；锁定时返回 null */
  keyProvider: () => CryptoKey | null;
}

export class VaultLockedError extends Error {
  constructor() {
    super('vault is locked');
    this.name = 'VaultLockedError';
  }
}

/** 敏感字段被加密后保存在内层 entry.tagsKey 字段不动；用 plainText 字段挪用：把 cipher json 编码塞回去？
 *  更干净：内层 Dexie repo 的 Entry 类型有 contentJson:unknown，我们把整个 EncryptedBlob 塞进 contentJson，
 *  并把 plainText 设为空字符串，title 设为 '🔒' 之类的占位。读取时检测 contentJson 中是否带 __cipher 标记。
 */

interface EncryptedMarker {
  __cipher: EncryptedBlob;
}

function isEncryptedMarker(x: unknown): x is EncryptedMarker {
  return (
    !!x &&
    typeof x === 'object' &&
    '__cipher' in (x as Record<string, unknown>) &&
    typeof (x as { __cipher?: unknown }).__cipher === 'object'
  );
}

interface SensitivePayload {
  title: string;
  contentJson: unknown;
  plainText: string;
  weather?: Entry['weather'];
}

export class EncryptingEntryRepository implements IEntryRepository {
  constructor(private readonly opts: EncryptingEntryRepoOpts) {}

  private getKey(): CryptoKey {
    const k = this.opts.keyProvider();
    if (!k) throw new VaultLockedError();
    return k;
  }

  private async encryptEntry(entry: Entry): Promise<Entry> {
    const key = this.getKey();
    const payload: SensitivePayload = {
      title: entry.title,
      contentJson: entry.contentJson,
      plainText: entry.plainText,
      weather: entry.weather,
    };
    const blob = await this.opts.crypto.encrypt(JSON.stringify(payload), key);
    return {
      ...entry,
      title: '',
      contentJson: { __cipher: blob } satisfies EncryptedMarker,
      plainText: '',
      weather: undefined,
    };
  }

  private async decryptEntry(entry: Entry): Promise<Entry> {
    if (!isEncryptedMarker(entry.contentJson)) return entry;
    const key = this.getKey();
    const plain = await this.opts.crypto.decrypt(entry.contentJson.__cipher, key);
    const payload = JSON.parse(plain) as SensitivePayload;
    return {
      ...entry,
      title: payload.title,
      contentJson: payload.contentJson,
      plainText: payload.plainText,
      weather: payload.weather,
    };
  }

  async get(id: EntryId): Promise<Entry | null> {
    const e = await this.opts.inner.get(id);
    if (!e) return null;
    try {
      return await this.decryptEntry(e);
    } catch (err) {
      logger.error({ feature: 'enc-repo', action: 'decrypt_get_fail', error: err });
      throw err;
    }
  }

  async list(filter?: EntryListFilter): Promise<Entry[]> {
    const arr = await this.opts.inner.list(filter);
    const out: Entry[] = [];
    for (const e of arr) {
      out.push(await this.decryptEntry(e));
    }
    return out;
  }

  async save(entry: Entry): Promise<void> {
    // 若已是 cipher entry（极少见），直接保存
    if (isEncryptedMarker(entry.contentJson)) {
      await this.opts.inner.save(entry);
      return;
    }
    const enc = await this.encryptEntry(entry);
    await this.opts.inner.save(enc);
  }

  async delete(id: EntryId): Promise<void> {
    await this.opts.inner.delete(id);
  }

  async countByDay(ym: { year: number; month: number }): Promise<Record<string, number>> {
    // 时间戳并不加密；直接透传
    return this.opts.inner.countByDay(ym);
  }
}
