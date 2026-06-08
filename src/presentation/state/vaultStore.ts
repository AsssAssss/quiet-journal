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

const ATTEMPTS_KEY = 'quiet:vault-attempts';

/** 冷却梯度（毫秒）。索引 = 失败次数 - 5，超出范围用最后一档。 */
const LOCKOUT_LADDER = [
  30_000,        // 5 次：30 秒
  60_000,        // 6
  60_000,
  120_000,
  300_000,       // 9
  300_000,       // 10：5 分钟
  600_000,
  1_200_000,
  1_800_000,     // 13：30 分钟
  1_800_000,
  3_600_000,     // 15+：1 小时
];
const LOCKOUT_START = 5;

interface AttemptsState {
  failed: number;
  lockoutUntil: number | null;
}

function readAttempts(): AttemptsState {
  if (typeof window === 'undefined') return { failed: 0, lockoutUntil: null };
  const raw = window.localStorage.getItem(ATTEMPTS_KEY);
  if (!raw) return { failed: 0, lockoutUntil: null };
  try {
    const v = JSON.parse(raw) as AttemptsState;
    return {
      failed: typeof v.failed === 'number' ? v.failed : 0,
      lockoutUntil: typeof v.lockoutUntil === 'number' ? v.lockoutUntil : null,
    };
  } catch {
    return { failed: 0, lockoutUntil: null };
  }
}

function writeAttempts(s: AttemptsState): void {
  window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(s));
}

function lockoutMsForFails(fails: number): number {
  if (fails < LOCKOUT_START) return 0;
  const idx = Math.min(fails - LOCKOUT_START, LOCKOUT_LADDER.length - 1);
  return LOCKOUT_LADDER[idx]!;
}

interface VaultState {
  status: VaultStatus;
  /** 解锁后的主密钥；锁定/未启用为 null */
  key: CryptoKey | null;
  unlockedAt: number | null;
  error?: string;

  /** 连续解锁失败次数（成功解锁后归零） */
  failedAttempts: number;
  /** 冷却到此时间戳前不允许再尝试；null 表示无冷却 */
  lockoutUntil: number | null;

  // composition
  repo: IVaultRepository;
  crypto: IEncryptionService;

  init: () => Promise<void>;
  setup: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  disable: () => Promise<void>;
  /** 忘记密码：销毁 vault 配置并清空底层条目（无法解密只能丢弃） */
  resetVault: (wipeEntries: () => Promise<void>) => Promise<void>;
}

const defaultRepo: IVaultRepository = new DexieVaultRepository();
const defaultCrypto: IEncryptionService = new WebCryptoEncryptionService();

export const useVaultStore = create<VaultState>((set, get) => {
  const initialAttempts = readAttempts();
  return {
    status: 'unknown',
    key: null,
    unlockedAt: null,
    failedAttempts: initialAttempts.failed,
    lockoutUntil: initialAttempts.lockoutUntil,
    repo: defaultRepo,
    crypto: defaultCrypto,

    async init() {
      const cfg = await get().repo.get();
      const attempts = readAttempts();
      set({
        status: cfg && cfg.enabled ? 'locked' : 'absent',
        key: null,
        unlockedAt: null,
        failedAttempts: attempts.failed,
        lockoutUntil: attempts.lockoutUntil,
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
        writeAttempts({ failed: 0, lockoutUntil: null });
        set({
          status: 'unlocked',
          key,
          unlockedAt: Date.now(),
          failedAttempts: 0,
          lockoutUntil: null,
        });
      } catch (e) {
        set({ error: (e as Error).message });
        throw e;
      }
    },

    async unlock(password: string) {
      // 冷却中拒绝
      const { lockoutUntil } = get();
      if (lockoutUntil && Date.now() < lockoutUntil) {
        const remain = Math.ceil((lockoutUntil - Date.now()) / 1000);
        const err = new Error(`请稍候 ${remain}s 再试`);
        set({ error: err.message });
        throw err;
      }
      set({ error: undefined });
      try {
        const { key } = await unlockVault(
          { vaultRepo: get().repo, crypto: get().crypto },
          password,
        );
        // 成功 → 归零
        writeAttempts({ failed: 0, lockoutUntil: null });
        set({
          status: 'unlocked',
          key,
          unlockedAt: Date.now(),
          failedAttempts: 0,
          lockoutUntil: null,
        });
      } catch (e) {
        // 失败 → 累加 + 可能冷却
        const nextFails = get().failedAttempts + 1;
        const lockMs = lockoutMsForFails(nextFails);
        const nextLockoutUntil = lockMs > 0 ? Date.now() + lockMs : null;
        writeAttempts({ failed: nextFails, lockoutUntil: nextLockoutUntil });
        set({
          failedAttempts: nextFails,
          lockoutUntil: nextLockoutUntil,
          error: (e as Error).message,
        });
        logger.warn({
          feature: 'vault',
          action: 'unlock_fail',
          resp: { failedAttempts: nextFails, lockoutMs: lockMs },
        });
        throw e;
      }
    },

    lock() {
      set({ status: 'locked', key: null, unlockedAt: null });
      logger.debug({ feature: 'vault', action: 'lock' });
    },

    async disable() {
      await disableVault({ vaultRepo: get().repo, crypto: get().crypto });
      writeAttempts({ failed: 0, lockoutUntil: null });
      set({
        status: 'absent',
        key: null,
        unlockedAt: null,
        failedAttempts: 0,
        lockoutUntil: null,
      });
    },

    async resetVault(wipeEntries) {
      // 1) 清空所有底层条目（已加密的没法解密，只能丢弃）
      await wipeEntries();
      // 2) 删除 vault 配置
      await disableVault({ vaultRepo: get().repo, crypto: get().crypto });
      writeAttempts({ failed: 0, lockoutUntil: null });
      set({
        status: 'absent',
        key: null,
        unlockedAt: null,
        failedAttempts: 0,
        lockoutUntil: null,
        error: undefined,
      });
      logger.warn({ feature: 'vault', action: 'reset' });
    },
  };
});

export function setVaultDeps(opts: {
  repo?: IVaultRepository;
  crypto?: IEncryptionService;
}) {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ATTEMPTS_KEY);
  }
  useVaultStore.setState({
    repo: opts.repo ?? defaultRepo,
    crypto: opts.crypto ?? defaultCrypto,
    status: 'unknown',
    key: null,
    unlockedAt: null,
    failedAttempts: 0,
    lockoutUntil: null,
  });
}
