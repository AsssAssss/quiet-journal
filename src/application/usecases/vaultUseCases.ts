import {
  type VaultConfig,
  VAULT_VERIFIER_PLAINTEXT,
} from '@/domain/entities/Vault';
import type { IVaultRepository } from '@/domain/repositories/IVaultRepository';
import {
  EncryptionError,
  type IEncryptionService,
  WrongPasswordError,
} from '@/domain/services/IEncryptionService';
import { bytesToBase64, base64ToBytes } from '@/infrastructure/crypto/base64';
import { logger, newRequestId } from '@/shared/logger';

export const DEFAULT_PBKDF2_ITERATIONS = 250_000;

export interface VaultUseCaseDeps {
  vaultRepo: IVaultRepository;
  crypto: IEncryptionService;
}

/** 首次设置主密码：生成盐 + 派生密钥 + 加密 verifier；返回主密钥用于上层持有 */
export async function setupVault(
  deps: VaultUseCaseDeps,
  password: string,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS,
): Promise<{ key: CryptoKey; config: VaultConfig }> {
  const requestId = newRequestId();
  logger.debug({ feature: 'vault', action: 'setup_start', requestId });
  if (password.length < 4) throw new Error('密码至少 4 位');
  const salt = deps.crypto.newSalt();
  const key = await deps.crypto.deriveKey(password, salt, iterations);
  const verifier = await deps.crypto.encrypt(VAULT_VERIFIER_PLAINTEXT, key);
  const now = Date.now();
  const config: VaultConfig = {
    id: 'main',
    enabled: true,
    salt: bytesToBase64(salt),
    iterations,
    verifier,
    createdAt: now,
    updatedAt: now,
  };
  await deps.vaultRepo.save(config);
  logger.debug({ feature: 'vault', action: 'setup_done', requestId });
  return { key, config };
}

/** 输入密码解锁：派生密钥 + 验证 verifier；失败抛 WrongPasswordError */
export async function unlockVault(
  deps: VaultUseCaseDeps,
  password: string,
): Promise<{ key: CryptoKey; config: VaultConfig }> {
  const requestId = newRequestId();
  logger.debug({ feature: 'vault', action: 'unlock_start', requestId });
  const config = await deps.vaultRepo.get();
  if (!config || !config.enabled) {
    throw new Error('vault 未启用');
  }
  const salt = base64ToBytes(config.salt);
  const key = await deps.crypto.deriveKey(password, salt, config.iterations);
  try {
    const plain = await deps.crypto.decrypt(config.verifier, key);
    if (plain !== VAULT_VERIFIER_PLAINTEXT) throw new WrongPasswordError();
  } catch (e) {
    if (e instanceof EncryptionError) {
      throw new WrongPasswordError();
    }
    throw e;
  }
  logger.debug({ feature: 'vault', action: 'unlock_done', requestId });
  return { key, config };
}

/** 关闭私密模式：删除 vault 配置 */
export async function disableVault(deps: VaultUseCaseDeps): Promise<void> {
  await deps.vaultRepo.remove();
  logger.debug({ feature: 'vault', action: 'disable' });
}
