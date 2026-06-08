import type { Entry } from '../entities/Entry';

export interface SearchHit {
  entry: Entry;
  /** 相关度评分 */
  score: number;
  /** 命中片段（已含 <mark> 高亮），用于列表展示 */
  snippet: string;
}

export interface ISearchIndex {
  /** 用一组 entries 重新建立索引（清空旧数据） */
  rebuild(entries: Entry[]): void;
  /** 查询；空查询返回 [] */
  search(query: string, limit?: number): SearchHit[];
}
