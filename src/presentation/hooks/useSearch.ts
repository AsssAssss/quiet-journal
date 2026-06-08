import { useEffect, useMemo, useState } from 'react';
import type { Entry } from '@/domain/entities/Entry';
import type { SearchHit } from '@/domain/services/ISearchIndex';
import { MiniSearchIndex } from '@/infrastructure/search/miniSearchIndex';

interface UseSearchOpts {
  entries: Entry[];
  query: string;
  /** 输入 debounce 毫秒，默认 120 */
  delay?: number;
}

export function useSearch({ entries, query, delay = 120 }: UseSearchOpts): {
  hits: SearchHit[];
  active: boolean;
} {
  const index = useMemo(() => new MiniSearchIndex(), []);

  useEffect(() => {
    index.rebuild(entries);
  }, [entries, index]);

  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), delay);
    return () => clearTimeout(t);
  }, [query, delay]);

  const hits = useMemo(() => index.search(debounced), [index, debounced, entries]);
  return { hits, active: debounced.trim().length > 0 };
}
