import type { IEntryRepository } from '@/domain/repositories/IEntryRepository';
import type { EntryId } from '@/domain/valueObjects/EntryId';
import { logger, newRequestId } from '@/shared/logger';

export interface DeleteEntryDeps {
  entryRepo: IEntryRepository;
}

export async function deleteEntryUseCase(
  deps: DeleteEntryDeps,
  id: EntryId,
): Promise<void> {
  const requestId = newRequestId();
  logger.debug({ feature: 'usecase.deleteEntry', action: 'start', requestId, req: { id } });
  await deps.entryRepo.delete(id);
  logger.debug({ feature: 'usecase.deleteEntry', action: 'done', requestId });
}
