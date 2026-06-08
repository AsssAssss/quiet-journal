import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor, type EditorChangePayload } from '@/presentation/components/Editor/Editor';
import { SaveIndicator } from '@/presentation/components/SaveIndicator';
import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { MoodPicker } from '@/presentation/components/MoodPicker';
import { TagInput } from '@/presentation/components/TagInput';
import { WeatherInput } from '@/presentation/components/WeatherInput';
import { useAutoSave } from '@/presentation/hooks/useAutoSave';
import { useEntryStore } from '@/presentation/state/entryStore';
import type { EntryId } from '@/domain/valueObjects/EntryId';
import {
  type Mood,
  type Weather,
  entryDisplayTitle,
} from '@/domain/entities/Entry';

interface Draft {
  title: string;
  contentJson: unknown;
  plainText: string;
  mood?: Mood;
  tags: string[];
  weather?: Weather;
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[64px_1fr] items-center gap-3">
      <div className="text-xs text-muted tracking-wider select-none">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { entries, loaded, load, create, update, remove } = useEntryStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  useEffect(() => {
    if (!loaded || id) return;
    if (entries.length > 0) {
      navigate(`/entry/${entries[0]!.id}`, { replace: true });
    } else {
      void create().then((e) => navigate(`/entry/${e.id}`, { replace: true }));
    }
  }, [loaded, id, entries, navigate, create]);

  const entry = useMemo(
    () => entries.find((e) => e.id === (id as EntryId | undefined)),
    [entries, id],
  );

  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (!entry) {
      setDraft(null);
      return;
    }
    setDraft({
      title: entry.title,
      contentJson: entry.contentJson,
      plainText: entry.plainText,
      mood: entry.mood,
      tags: entry.tags,
      weather: entry.weather,
    });
  }, [entry?.id]);

  const { status, savedAt } = useAutoSave({
    value: draft,
    delay: 800,
    enabled: !!entry && !!draft,
    save: async (d) => {
      if (!entry || !d) return;
      await update(entry.id, {
        title: d.title,
        contentJson: d.contentJson,
        plainText: d.plainText,
        mood: d.mood === undefined ? null : d.mood,
        tags: d.tags,
        weather: d.weather === undefined ? null : d.weather,
      });
    },
  });

  if (!entry || !draft) {
    return (
      <div className="mx-auto max-w-3xl px-10 py-16 text-muted">载入中…</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-10 py-16">
      <div className="flex items-center justify-between mb-3 text-xs text-muted tracking-wider uppercase">
        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} savedAt={savedAt} />
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="删除该条目"
            data-testid="delete-current-entry"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted hover:text-ink transition-colors duration-quiet ease-quiet"
            title="删除该条目"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <input
        type="text"
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="未命名的一天"
        aria-label="标题"
        data-testid="entry-title"
        className="w-full bg-transparent border-0 font-serif text-3xl leading-tight mb-4 outline-none placeholder:text-muted/60"
      />

      {/* 元数据条 —— 心情 · 天气 · 标签 */}
      <div
        className="mb-8 pb-6 border-b grid gap-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <MetaRow label="心情">
          <MoodPicker
            value={draft.mood}
            onChange={(mood) => setDraft({ ...draft, mood })}
          />
        </MetaRow>
        <MetaRow label="天气">
          <WeatherInput
            value={draft.weather}
            onChange={(weather) => setDraft({ ...draft, weather })}
          />
        </MetaRow>
        <MetaRow label="标签">
          <TagInput
            value={draft.tags}
            onChange={(tags) => setDraft({ ...draft, tags })}
          />
        </MetaRow>
      </div>

      <Editor
        initialContent={draft.contentJson}
        onChange={(p: EditorChangePayload) =>
          setDraft({ ...draft, contentJson: p.contentJson, plainText: p.plainText })
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        destructive
        title="确认删除"
        description={`「${entryDisplayTitle(entry)}」将被永久删除，无法恢复。`}
        confirmLabel="删除"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await remove(entry.id);
          setConfirmDelete(false);
          navigate('/timeline');
        }}
      />
    </div>
  );
}
