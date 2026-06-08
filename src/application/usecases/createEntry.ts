import { type CreateEntryInput, type Entry, createEntry } from '@/domain/entities/Entry';
import type { IEntryRepository } from '@/domain/repositories/IEntryRepository';
import { logger, newRequestId } from '@/shared/logger';

export interface CreateEntryDeps {
  entryRepo: IEntryRepository;
}

export async function createEntryUseCase(
  deps: CreateEntryDeps,
  input: CreateEntryInput = {},
): Promise<Entry> {
  const requestId = newRequestId();
  logger.debug({ feature: 'usecase.createEntry', action: 'start', requestId, req: input });
  const entry = createEntry(input);
  await deps.entryRepo.save(entry);
  logger.debug({
    feature: 'usecase.createEntry',
    action: 'done',
    requestId,
    resp: { id: entry.id },
  });
  return entry;
}
