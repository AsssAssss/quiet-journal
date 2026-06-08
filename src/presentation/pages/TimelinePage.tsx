import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useEntryStore } from '@/presentation/state/entryStore';
import { EntryCard } from '@/presentation/components/EntryCard';
import { SearchBar } from '@/presentation/components/SearchBar';
import { SearchResultCard } from '@/presentation/components/SearchResultCard';
import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { type Entry, entryDisplayTitle } from '@/domain/entities/Entry';
import { useSearch } from '@/presentation/hooks/useSearch';

export function TimelinePage() {
  const { entries, loaded, load, create, remove } = useEntryStore();
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const { hits, active: searching } = useSearch({ entries, query });

  const allTags = useMemo(() => {
    const set = new Map<string, number>();
    for (const e of entries) {
      for (const t of e.tags) set.set(t, (set.get(t) ?? 0) + 1);
    }
    return Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!tagFilter) return entries;
    return entries.filter((e) => e.tags.includes(tagFilter));
  }, [entries, tagFilter]);

  const groups = useMemo(() => groupByMonth(filteredEntries), [filteredEntries]);

  return (
    <div className="mx-auto max-w-3xl px-10 py-16">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="font-serif text-2xl">时间线</h1>
        <button
          type="button"
          className="quiet-btn"
          data-testid="new-entry"
          onClick={async () => {
            const e = await create();
            navigate(`/entry/${e.id}`);
          }}
        >
          + 新条目
        </button>
      </div>

      <div className="mb-4">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {!searching && allTags.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-1.5" data-testid="tag-filter">
          <span className="text-xs text-muted mr-1">标签</span>
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className="text-xs px-2 py-0.5 rounded-full transition-colors duration-quiet ease-quiet"
            style={{
              background: tagFilter === null ? 'var(--accent)' : 'var(--accent-soft)',
              color: tagFilter === null ? 'var(--bg)' : 'var(--text-muted)',
            }}
            data-testid="tag-filter-all"
          >
            全部
          </button>
          {allTags.map(([t, n]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTagFilter(t === tagFilter ? null : t)}
              data-testid={`tag-filter-${t}`}
              className="text-xs px-2 py-0.5 rounded-full transition-colors duration-quiet ease-quiet"
              style={{
                background: tagFilter === t ? 'var(--accent)' : 'var(--accent-soft)',
                color: tagFilter === t ? 'var(--bg)' : 'var(--text-muted)',
              }}
            >
              {t} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
      )}

      {searching ? (
        hits.length === 0 ? (
          <div className="quiet-card p-12 text-center text-muted text-sm">
            未找到匹配「{query}」的条目
          </div>
        ) : (
          <div className="space-y-3" data-testid="search-results">
            <div className="text-xs text-muted mb-2">共 {hits.length} 条结果</div>
            {hits.map(({ entry, snippet }) => (
              <SearchResultCard key={entry.id} entry={entry} snippet={snippet} />
            ))}
          </div>
        )
      ) : entries.length === 0 ? (
        <div className="quiet-card p-12 text-center">
          <div className="text-muted text-sm">还没有记录。从「新条目」开始吧。</div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="quiet-card p-12 text-center text-muted text-sm">
          标签「{tagFilter}」下没有条目
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(({ key, label, items }) => (
            <section key={key}>
              <div className="text-xs text-muted tracking-wider uppercase mb-3">{label}</div>
              <div className="space-y-3">
                {items.map((e) => (
                  <EntryCard key={e.id} entry={e} onDelete={setPendingDelete} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        destructive
        title="确认删除"
        description={
          pendingDelete
            ? `「${entryDisplayTitle(pendingDelete)}」将被永久删除，无法恢复。`
            : undefined
        }
        confirmLabel="删除"
        cancelLabel="取消"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await remove(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function groupByMonth<E extends { createdAt: number }>(entries: E[]) {
  const map = new Map<string, E[]>();
  for (const e of entries) {
    const key = format(e.createdAt, 'yyyy-MM');
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: format(new Date(`${key}-01T00:00:00`), 'yyyy 年 MM 月'),
    items,
  }));
}
