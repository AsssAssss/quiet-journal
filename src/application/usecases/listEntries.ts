import type { Entry } from '@/domain/entities/Entry';
import type {
  EntryListFilter,
  IEntryRepository,
} from '@/domain/repositories/IEntryRepository';
import { logger, newRequestId } from '@/shared/logger';

export interface ListEntriesDeps {
  entryRepo: IEntryRepository;
}

export async function listEntriesUseCase(
  deps: ListEntriesDeps,
  filter?: EntryListFilter,
): Promise<Entry[]> {
  const requestId = newRequestId();
  logger.debug({
    feature: 'usecase.listEntries',
    action: 'start',
    requestId,
    req: filter ?? {},
  });
  const list = await deps.entryRepo.list(filter);
  logger.debug({
    feature: 'usecase.listEntries',
    action: 'done',
    requestId,
    resp: { count: list.length },
  });
  return list;
}
