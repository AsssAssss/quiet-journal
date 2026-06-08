export type EntryId = string & { readonly __brand: 'EntryId' };

export function newEntryId(): EntryId {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID() as EntryId;
  }
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` as EntryId;
}
