import type { Entry } from '../entities/Entry';
import type { EntryId } from '../valueObjects/EntryId';

export interface EntryListFilter {
  tag?: string;
  /** 起止毫秒时间戳（含） */
  from?: number;
  to?: number;
  /** 返回最多多少条，默认不限制 */
  limit?: number;
}

/**
 * Entry 仓储端口。Use Case 层只依赖此接口，infrastructure 实现具体存储。
 */
export interface IEntryRepository {
  get(id: EntryId): Promise<Entry | null>;
  list(filter?: EntryListFilter): Promise<Entry[]>;
  save(entry: Entry): Promise<void>;
  delete(id: EntryId): Promise<void>;
  /** 按月统计每天的条目数，用于日历视图 */
  countByDay(yearMonth: { year: number; month: number }): Promise<Record<string, number>>;
}
