import { type Entry, type UpdateEntryPatch, updateEntry } from '@/domain/entities/Entry';
import type { IEntryRepository } from '@/domain/repositories/IEntryRepository';
import type { EntryId } from '@/domain/valueObjects/EntryId';
import { logger, newRequestId } from '@/shared/logger';

export interface UpdateEntryDeps {
  entryRepo: IEntryRepository;
}

export class EntryNotFoundError extends Error {
  constructor(public readonly id: EntryId) {
    super(`entry not found: ${id}`);
    this.name = 'EntryNotFoundError';
  }
}

export async function updateEntryUseCase(
  deps: UpdateEntryDeps,
  id: EntryId,
  patch: UpdateEntryPatch,
): Promise<Entry> {
  const requestId = newRequestId();
  logger.debug({ feature: 'usecase.updateEntry', action: 'start', requestId, req: { id, patch } });
  const existing = await deps.entryRepo.get(id);
  if (!existing) {
    logger.warn({ feature: 'usecase.updateEntry', action: 'not_found', requestId, req: { id } });
    throw new EntryNotFoundError(id);
  }
  const next = updateEntry(existing, patch);
  await deps.entryRepo.save(next);
  logger.debug({ feature: 'usecase.updateEntry', action: 'done', requestId, resp: { id } });
  return next;
}
