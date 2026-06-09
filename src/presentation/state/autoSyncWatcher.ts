import { onEntryMutated, useEntryStore, type EntryMutation } from './entryStore';
import { makeAdapter, useSyncStore } from './syncStore';
import { logger } from '@/shared/logger';

/**
 * 自动同步监听器（仅 filesystem 模式启用）：
 *  - 每次 entry create/update/delete 后，单条 push/delete 到目标目录
 *  - debounce 同 id 的多次 update（避免连续敲键盘时频繁写盘）
 *  - 错误静默 + 写 logger，不阻塞用户主流程
 *
 * 其他同步模式（WebDAV / PocketBase）不自动 push —— 由用户在设置页手动
 * "立即同步"或后续接入服务端推送。
 */
let pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 600;

export function startAutoSync(): () => void {
  return onEntryMutated((m) => {
    const cfg = useSyncStore.getState().config;
    if (!cfg || cfg.kind !== 'filesystem') return;
    schedulePush(m);
  });
}

function schedulePush(m: EntryMutation): void {
  const key = `${m.type}:${m.id}`;
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingTimers.delete(key);
    void runPush(m);
  }, DEBOUNCE_MS);
  pendingTimers.set(key, timer);
}

async function runPush(m: EntryMutation): Promise<void> {
  const cfg = useSyncStore.getState().config;
  if (!cfg || cfg.kind !== 'filesystem') return;
  try {
    const adapter = await makeAdapter(cfg);
    if (m.type === 'delete') {
      await adapter.deleteFile(`entries/${m.id}.json`);
      logger.debug({ feature: 'auto-sync', action: 'delete', req: { id: m.id } });
      return;
    }
    // 'put'：从底层仓储拿原始（可能加密的）entry 序列化后写入
    const base = useEntryStore.getState().baseRepo;
    const raw = await base.get(m.id);
    if (!raw) return;
    const body = JSON.stringify({ entry: raw, updatedAt: raw.updatedAt });
    await adapter.putFile(`entries/${m.id}.json`, body);
    logger.debug({ feature: 'auto-sync', action: 'put', req: { id: m.id } });
  } catch (e) {
    logger.warn({ feature: 'auto-sync', action: 'fail', error: e });
  }
}

/** 仅供测试：重置内部定时器队列 */
export function _resetAutoSync(): void {
  for (const t of pendingTimers.values()) clearTimeout(t);
  pendingTimers = new Map();
}
