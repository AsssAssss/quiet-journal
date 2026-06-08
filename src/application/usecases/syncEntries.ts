import type { Entry } from '@/domain/entities/Entry';
import type { IEntryRepository } from '@/domain/repositories/IEntryRepository';
import type { IRemoteSyncAdapter } from '@/domain/repositories/IRemoteSyncAdapter';
import type { EntryId } from '@/domain/valueObjects/EntryId';
import { logger, newRequestId } from '@/shared/logger';

export interface SyncDeps {
  local: IEntryRepository;
  remote: IRemoteSyncAdapter;
}

export interface SyncResult {
  uploaded: number;
  downloaded: number;
  conflicts: number;
  total: number;
  durationMs: number;
}

const PREFIX = 'entries/';
const SUFFIX = '.json';
const pathOf = (id: EntryId) => `${PREFIX}${id}${SUFFIX}`;
const idOf = (path: string): EntryId =>
  path.replace(PREFIX, '').replace(SUFFIX, '') as EntryId;

interface RemoteEntryFile {
  /** 序列化的 entry（如果本地是 vault 模式，正文已加密，远端看不到明文） */
  entry: Entry;
  /** 文件本身的 updatedAt（便于在不下载正文时比较） */
  updatedAt: number;
}

/**
 * 双向同步：以 updatedAt 为依据决定方向。
 *
 *  - 仅本地有：上传
 *  - 仅远端有：下载
 *  - 两边都有且 updatedAt 不同：取更新的一侧 -> 覆盖另一侧；如果两侧都比上次同步新（待来支持 lastSyncAt
 *    时再判断），先暂以远端为准记冲突。
 *
 * 本版本不处理删除（墓碑机制留待 M6）。
 */
export async function syncEntries(deps: SyncDeps): Promise<SyncResult> {
  const requestId = newRequestId();
  const t0 = Date.now();
  logger.info({ feature: 'sync', action: 'start', requestId });

  const local = await deps.local.list();
  const localById = new Map<EntryId, Entry>(local.map((e) => [e.id, e]));

  const remoteList = await deps.remote.listFiles(PREFIX);
  const remoteIds = new Set<EntryId>();
  for (const f of remoteList) {
    if (!f.path.endsWith(SUFFIX)) continue;
    remoteIds.add(idOf(f.path));
  }

  let uploaded = 0;
  let downloaded = 0;
  let conflicts = 0;

  // 上传仅本地有 或 本地更新的
  for (const e of local) {
    if (!remoteIds.has(e.id)) {
      await uploadOne(deps, e);
      uploaded++;
      continue;
    }
    // 下载远端版本，比较 updatedAt
    const file = await fetchRemote(deps, e.id);
    if (!file) continue;
    if (e.updatedAt > file.entry.updatedAt) {
      await uploadOne(deps, e);
      uploaded++;
    } else if (e.updatedAt < file.entry.updatedAt) {
      await deps.local.save(file.entry);
      downloaded++;
    }
    // updatedAt 相等：跳过
  }

  // 下载仅远端有
  for (const id of remoteIds) {
    if (localById.has(id)) continue;
    const file = await fetchRemote(deps, id);
    if (!file) continue;
    await deps.local.save(file.entry);
    downloaded++;
  }

  const durationMs = Date.now() - t0;
  logger.info({
    feature: 'sync',
    action: 'done',
    requestId,
    resp: { uploaded, downloaded, conflicts, durationMs },
  });
  return {
    uploaded,
    downloaded,
    conflicts,
    total: remoteIds.size + uploaded,
    durationMs,
  };
}

async function uploadOne(deps: SyncDeps, e: Entry): Promise<void> {
  const body = JSON.stringify({ entry: e, updatedAt: e.updatedAt } satisfies RemoteEntryFile);
  await deps.remote.putFile(pathOf(e.id), body);
}

async function fetchRemote(
  deps: SyncDeps,
  id: EntryId,
): Promise<RemoteEntryFile | null> {
  const raw = await deps.remote.getFile(pathOf(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RemoteEntryFile;
  } catch (e) {
    logger.warn({ feature: 'sync', action: 'parse_fail', req: { id }, error: e });
    return null;
  }
}
