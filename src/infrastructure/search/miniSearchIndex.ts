import MiniSearch from 'minisearch';
import { type Entry, entryDisplayTitle } from '@/domain/entities/Entry';
import type { ISearchIndex, SearchHit } from '@/domain/services/ISearchIndex';

interface IndexDoc {
  id: string;
  title: string;
  plainText: string;
  tags: string;
}

/**
 * 基于 MiniSearch 的全文搜索实现。中文按字符 ngram 处理。
 */
export class MiniSearchIndex implements ISearchIndex {
  private mini: MiniSearch<IndexDoc>;
  private entryMap = new Map<string, Entry>();

  constructor() {
    this.mini = new MiniSearch<IndexDoc>({
      fields: ['title', 'plainText', 'tags'],
      storeFields: ['title', 'plainText', 'tags'],
      // 中文：按单字切；西文：按空格切
      tokenize: (text) => {
        if (!text) return [];
        const tokens: string[] = [];
        const re = /[一-鿿]|[A-Za-z0-9]+/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          tokens.push(m[0]);
        }
        return tokens;
      },
      processTerm: (term) => term.toLowerCase(),
      searchOptions: {
        prefix: true,
        fuzzy: 0.2,
        boost: { title: 2, tags: 1.4 },
      },
    });
  }

  rebuild(entries: Entry[]): void {
    this.mini.removeAll();
    this.entryMap.clear();
    const docs: IndexDoc[] = entries.map((e) => ({
      id: e.id,
      title: entryDisplayTitle(e),
      plainText: e.plainText,
      tags: e.tags.join(' '),
    }));
    this.mini.addAll(docs);
    for (const e of entries) this.entryMap.set(e.id, e);
  }

  search(query: string, limit = 30): SearchHit[] {
    const q = query.trim();
    if (!q) return [];
    const raw = this.mini.search(q).slice(0, limit);
    return raw
      .map((r): SearchHit | null => {
        const entry = this.entryMap.get(r.id as string);
        if (!entry) return null;
        return {
          entry,
          score: r.score,
          snippet: makeSnippet(entry.plainText || entry.title, q),
        };
      })
      .filter((x): x is SearchHit => x !== null);
  }
}

/** 在 plainText 中找出第一处包含 query 任一字符的窗口，并用 <mark> 高亮 */
export function makeSnippet(text: string, query: string, win = 60): string {
  if (!text) return '';
  const qTokens = Array.from(query)
    .filter((c) => /\S/.test(c))
    .map((c) => c.toLowerCase());
  if (qTokens.length === 0) return text.slice(0, win);

  const lower = text.toLowerCase();
  let hitIdx = -1;
  for (const t of qTokens) {
    const i = lower.indexOf(t);
    if (i >= 0) {
      hitIdx = i;
      break;
    }
  }
  if (hitIdx < 0) return text.slice(0, win);
  const halfBefore = Math.max(0, hitIdx - Math.floor(win / 3));
  const slice = text.slice(halfBefore, halfBefore + win);
  return slice
    .split('')
    .map((ch) => (qTokens.includes(ch.toLowerCase()) ? `<mark>${ch}</mark>` : ch))
    .join('');
}
