import { create } from 'zustand';
import type { Entry, UpdateEntryPatch } from '@/domain/entities/Entry';
import type { IEntryRepository } from '@/domain/repositories/IEntryRepository';
import type { EntryId } from '@/domain/valueObjects/EntryId';
import { createEntryUseCase } from '@/application/usecases/createEntry';
import { deleteEntryUseCase } from '@/application/usecases/deleteEntry';
import { listEntriesUseCase } from '@/application/usecases/listEntries';
import { updateEntryUseCase } from '@/application/usecases/updateEntry';
import { DexieEntryRepository } from '@/infrastructure/persistence/dexieEntryRepository';
import {
  EncryptingEntryRepository,
} from '@/infrastructure/persistence/encryptingEntryRepository';
import { WebCryptoEncryptionService } from '@/infrastructure/crypto/webCryptoEncryptionService';
import { useVaultStore } from './vaultStore';

interface EntryStoreState {
  /** 底层明文仓储；加密 wrapper 在外面包 */
  baseRepo: IEntryRepository;
  entries: Entry[];
  loaded: boolean;
  loading: boolean;
  error?: string;

  load: () => Promise<void>;
  create: () => Promise<Entry>;
  update: (id: EntryId, patch: UpdateEntryPatch) => Promise<Entry>;
  remove: (id: EntryId) => Promise<void>;
}

const defaultBase: IEntryRepository = new DexieEntryRepository();
const cryptoSvc = new WebCryptoEncryptionService();

/** 拿到"当前应当使用的"仓储：未启用 vault → 明文；解锁 → 加密装饰；锁定 → 加密装饰（操作时抛错） */
function currentRepo(base: IEntryRepository): IEntryRepository {
  const status = useVaultStore.getState().status;
  if (status === 'unlocked' || status === 'locked') {
    return new EncryptingEntryRepository({
      inner: base,
      crypto: cryptoSvc,
      keyProvider: () => useVaultStore.getState().key,
    });
  }
  return base;
}

export type EntryMutation =
  | { type: 'put'; id: EntryId }
  | { type: 'delete'; id: EntryId };

let mutateHook: ((m: EntryMutation) => void) | null = null;

/** 注册 entry 变更钩子（用于 autoSync 等订阅者）。返回取消订阅函数。 */
export function onEntryMutated(fn: (m: EntryMutation) => void): () => void {
  mutateHook = fn;
  return () => {
    mutateHook = null;
  };
}

function emit(m: EntryMutation): void {
  try {
    mutateHook?.(m);
  } catch {
    /* 钩子错误不影响主流程 */
  }
}

export const useEntryStore = create<EntryStoreState>((set, get) => ({
  baseRepo: defaultBase,
  entries: [],
  loaded: false,
  loading: false,

  async load() {
    set({ loading: true, error: undefined });
    try {
      const entries = await listEntriesUseCase({
        entryRepo: currentRepo(get().baseRepo),
      });
      set({ entries, loaded: true, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  async create() {
    const e = await createEntryUseCase({ entryRepo: currentRepo(get().baseRepo) });
    set({ entries: [e, ...get().entries] });
    emit({ type: 'put', id: e.id });
    return e;
  },

  async update(id, patch) {
    const upd = await updateEntryUseCase(
      { entryRepo: currentRepo(get().baseRepo) },
      id,
      patch,
    );
    set({
      entries: get().entries.map((it) => (it.id === id ? upd : it)),
    });
    emit({ type: 'put', id: upd.id });
    return upd;
  },

  async remove(id) {
    await deleteEntryUseCase({ entryRepo: currentRepo(get().baseRepo) }, id);
    set({ entries: get().entries.filter((it) => it.id !== id) });
    emit({ type: 'delete', id });
  },
}));

/** 测试或场景注入：替换底层仓储并清空缓存 */
export function setEntryRepo(repo: IEntryRepository): void {
  useEntryStore.setState({ baseRepo: repo, entries: [], loaded: false });
}

/** 重新加载（vault 解锁/锁定/启用切换后调用） */
export async function reloadEntries(): Promise<void> {
  useEntryStore.setState({ loaded: false, entries: [] });
  await useEntryStore.getState().load();
}

/**
 * 把底层明文条目逐条通过加密 wrapper 重新保存 —— 用于"刚开启私密模式"时迁移历史数据。
 * 调用方需保证 vault 已 unlocked。
 */
export async function migrateBaseToEncrypted(): Promise<void> {
  const base = useEntryStore.getState().baseRepo;
  const enc = new EncryptingEntryRepository({
    inner: base,
    crypto: cryptoSvc,
    keyProvider: () => useVaultStore.getState().key,
  });
  const plain = await base.list();
  for (const e of plain) {
    await enc.save(e);
  }
}

/**
 * 把加密条目解密后写回底层明文 —— 用于"关闭私密模式"前。
 * 调用方需保证 vault 仍 unlocked。
 */
export async function migrateEncryptedToBase(): Promise<void> {
  const base = useEntryStore.getState().baseRepo;
  const enc = new EncryptingEntryRepository({
    inner: base,
    crypto: cryptoSvc,
    keyProvider: () => useVaultStore.getState().key,
  });
  const all = await enc.list(); // 自动解密
  for (const e of all) {
    await base.save(e); // 直接明文保存
  }
}

/**
 * 清空底层所有条目（不需要主密钥，因为只 list id 然后 delete）。
 * 用于"忘记密码 → 重置 vault"路径。
 */
export async function wipeAllEntries(): Promise<void> {
  const base = useEntryStore.getState().baseRepo;
  const all = await base.list();
  for (const e of all) {
    await base.delete(e.id);
  }
  useEntryStore.setState({ entries: [], loaded: true });
}
