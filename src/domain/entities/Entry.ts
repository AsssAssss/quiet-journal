import { type EntryId, newEntryId } from '../valueObjects/EntryId';

export type Mood = 1 | 2 | 3 | 4 | 5 | 6;

export interface Weather {
  code?: string;
  temp?: number;
  note?: string;
}

/**
 * 一条日记。富文本以 Tiptap JSON 形式存放；同时维护 plainText 给搜索用。
 * 纯领域对象，无任何框架依赖。
 */
export interface Entry {
  id: EntryId;
  title: string;
  contentJson: unknown; // Tiptap doc JSON
  plainText: string;
  mood?: Mood;
  tags: string[];
  weather?: Weather;
  createdAt: number;
  updatedAt: number;
}

export interface CreateEntryInput {
  title?: string;
  contentJson?: unknown;
  plainText?: string;
  mood?: Mood;
  tags?: string[];
  weather?: Weather;
  now?: number;
}

export class EntryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntryValidationError';
  }
}

export function createEntry(input: CreateEntryInput = {}): Entry {
  const now = input.now ?? Date.now();
  return {
    id: newEntryId(),
    title: (input.title ?? '').trim(),
    contentJson: input.contentJson ?? emptyDoc(),
    plainText: input.plainText ?? '',
    mood: input.mood,
    tags: dedupeTags(input.tags ?? []),
    weather: input.weather,
    createdAt: now,
    updatedAt: now,
  };
}

export interface UpdateEntryPatch {
  title?: string;
  contentJson?: unknown;
  plainText?: string;
  mood?: Mood | null;
  tags?: string[];
  weather?: Weather | null;
  now?: number;
}

export function updateEntry(entry: Entry, patch: UpdateEntryPatch): Entry {
  const next: Entry = { ...entry };
  if (patch.title !== undefined) next.title = patch.title.trim();
  if (patch.contentJson !== undefined) next.contentJson = patch.contentJson;
  if (patch.plainText !== undefined) next.plainText = patch.plainText;
  if (patch.mood !== undefined) next.mood = patch.mood === null ? undefined : patch.mood;
  if (patch.tags !== undefined) next.tags = dedupeTags(patch.tags);
  if (patch.weather !== undefined)
    next.weather = patch.weather === null ? undefined : patch.weather;
  next.updatedAt = patch.now ?? Date.now();
  if (next.updatedAt < entry.createdAt) {
    throw new EntryValidationError('updatedAt 不能早于 createdAt');
  }
  return next;
}

export function entryDisplayTitle(entry: Entry): string {
  if (entry.title) return entry.title;
  const firstLine = entry.plainText.split('\n').find((l) => l.trim().length > 0);
  return firstLine?.slice(0, 40) ?? '未命名';
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function emptyDoc() {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}
