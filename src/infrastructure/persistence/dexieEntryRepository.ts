import Dexie, { type Table } from 'dexie';
import type { Entry } from '@/domain/entities/Entry';
import type {
  EntryListFilter,
  IEntryRepository,
} from '@/domain/repositories/IEntryRepository';
import type { EntryId } from '@/domain/valueObjects/EntryId';
import { logger } from '@/shared/logger';

interface EntryRow extends Omit<Entry, 'tags'> {
  tags: string[];
  tagsKey: string; // 用于 multiEntry 索引
}

class QuietDB extends Dexie {
  entries!: Table<EntryRow, string>;
  constructor(name = 'quiet-journal') {
    super(name);
    this.version(1).stores({
      // multiEntry index on tags
      entries: 'id, createdAt, updatedAt, *tags',
    });
  }
}

function toRow(e: Entry): EntryRow {
  return { ...e, tagsKey: e.tags.join(',') };
}

function fromRow(r: EntryRow): Entry {
  const { tagsKey: _ignored, ...rest } = r;
  return rest as Entry;
}

export class DexieEntryRepository implements IEntryRepository {
  private db: QuietDB;

  constructor(dbName?: string) {
    this.db = new QuietDB(dbName);
  }

  async get(id: EntryId): Promise<Entry | null> {
    const r = await this.db.entries.get(id);
    logger.debug({ feature: 'repo.entry', action: 'get', req: { id }, resp: { hit: !!r } });
    return r ? fromRow(r) : null;
  }

  async list(filter?: EntryListFilter): Promise<Entry[]> {
    let query = this.db.entries.orderBy('createdAt').reverse();
    if (filter?.from !== undefined || filter?.to !== undefined) {
      const lo = filter.from ?? -Infinity;
      const hi = filter.to ?? Infinity;
      query = this.db.entries
        .where('createdAt')
        .between(lo, hi, true, true)
        .reverse();
    }
    if (filter?.tag) {
      const tag = filter.tag;
      query = query.filter((r) => r.tags.includes(tag));
    }
    let rows = await query.toArray();
    if (filter?.limit !== undefined) rows = rows.slice(0, filter.limit);
    logger.debug({
      feature: 'repo.entry',
      action: 'list',
      req: filter ?? {},
      resp: { count: rows.length },
    });
    return rows.map(fromRow);
  }

  async save(entry: Entry): Promise<void> {
    await this.db.entries.put(toRow(entry));
    logger.debug({ feature: 'repo.entry', action: 'save', req: { id: entry.id } });
  }

  async delete(id: EntryId): Promise<void> {
    await this.db.entries.delete(id);
    logger.debug({ feature: 'repo.entry', action: 'delete', req: { id } });
  }

  async countByDay(ym: { year: number; month: number }): Promise<Record<string, number>> {
    const start = new Date(ym.year, ym.month - 1, 1).getTime();
    const end = new Date(ym.year, ym.month, 1).getTime();
    const rows = await this.db.entries
      .where('createdAt')
      .between(start, end, true, false)
      .toArray();
    const out: Record<string, number> = {};
    for (const r of rows) {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out[key] = (out[key] ?? 0) + 1;
    }
    return out;
  }
}
