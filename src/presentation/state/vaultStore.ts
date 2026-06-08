import { create } from 'zustand';
import type { IVaultRepository } from '@/domain/repositories/IVaultRepository';
import type { IEncryptionService } from '@/domain/services/IEncryptionService';
import { WebCryptoEncryptionService } from '@/infrastructure/crypto/webCryptoEncryptionService';
import { DexieVaultRepository } from '@/infrastructure/persistence/dexieVaultRepository';
import {
  disableVault,
  setupVault,
  unlockVault,
} from '@/application/usecases/vaultUseCases';
import { logger } from '@/shared/logger';

export type VaultStatus = 'unknown' | 'absent' | 'locked' | 'unlocked';

interface VaultState {
  status: VaultStatus;
  /** 解锁后的主密钥；锁定/未启用为 null */
  key: CryptoKey | null;
  unlockedAt: number | null;
  error?: string;

  // composition
  repo: IVaultRepository;
  crypto: IEncryptionService;

  init: () => Promise<void>;
  setup: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  disable: () => Promise<void>;
}

const defaultRepo: IVaultRepository = new DexieVaultRepository();
const defaultCrypto: IEncryptionService = new WebCryptoEncryptionService();

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'unknown',
  key: null,
  unlockedAt: null,
  repo: defaultRepo,
  crypto: defaultCrypto,

  async init() {
    const cfg = await get().repo.get();
    set({
      status: cfg && cfg.enabled ? 'locked' : 'absent',
      key: null,
      unlockedAt: null,
    });
    logger.debug({ feature: 'vault', action: 'init', resp: { status: get().status } });
  },

  async setup(password: string) {
    set({ error: undefined });
    try {
      const { key } = await setupVault(
        { vaultRepo: get().repo, crypto: get().crypto },
        password,
      );
      set({ status: 'unlocked', key, unlockedAt: Date.now() });
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  async unlock(password: string) {
    set({ error: undefined });
    try {
      const { key } = await unlockVault(
        { vaultRepo: get().repo, crypto: get().crypto },
        password,
      );
      set({ status: 'unlocked', key, unlockedAt: Date.now() });
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  lock() {
    set({ status: 'locked', key: null, unlockedAt: null });
    logger.debug({ feature: 'vault', action: 'lock' });
  },

  async disable() {
    await disableVault({ vaultRepo: get().repo, crypto: get().crypto });
    set({ status: 'absent', key: null, unlockedAt: null });
  },
}));

export function setVaultDeps(opts: {
  repo?: IVaultRepository;
  crypto?: IEncryptionService;
}) {
  useVaultStore.setState({
    repo: opts.repo ?? defaultRepo,
    crypto: opts.crypto ?? defaultCrypto,
    status: 'unknown',
    key: null,
    unlockedAt: null,
  });
}
