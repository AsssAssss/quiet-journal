import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { WrongPasswordError } from '@/domain/services/IEncryptionService';
import { WebCryptoEncryptionService } from '@/infrastructure/crypto/webCryptoEncryptionService';
import { DexieVaultRepository } from '@/infrastructure/persistence/dexieVaultRepository';
import {
  disableVault,
  setupVault,
  unlockVault,
} from '../vaultUseCases';

function makeDeps() {
  return {
    vaultRepo: new DexieVaultRepository(`vault-${Math.random().toString(36).slice(2)}`),
    crypto: new WebCryptoEncryptionService(),
  };
}

describe('vault usecases', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    deps = makeDeps();
  });

  it('setupVault 保存配置并返回主密钥', async () => {
    const { config } = await setupVault(deps, 'hunter2', 10_000);
    expect(config.enabled).toBe(true);
    expect(config.salt.length).toBeGreaterThan(0);
    expect(config.iterations).toBe(10_000);
    expect(config.verifier.cipher.length).toBeGreaterThan(0);
    const stored = await deps.vaultRepo.get();
    expect(stored?.id).toBe('main');
  });

  it('setupVault 密码过短拒绝', async () => {
    await expect(setupVault(deps, 'abc', 10_000)).rejects.toThrow();
  });

  it('unlockVault 正确密码返回密钥', async () => {
    await setupVault(deps, 'hunter2', 10_000);
    const { key } = await unlockVault(deps, 'hunter2');
    expect(key).toBeDefined();
  });

  it('unlockVault 错误密码抛 WrongPasswordError', async () => {
    await setupVault(deps, 'hunter2', 10_000);
    await expect(unlockVault(deps, 'wrong')).rejects.toBeInstanceOf(
      WrongPasswordError,
    );
  });

  it('unlockVault vault 未启用抛错', async () => {
    await expect(unlockVault(deps, 'x')).rejects.toThrow();
  });

  it('disableVault 移除配置', async () => {
    await setupVault(deps, 'hunter2', 10_000);
    await disableVault(deps);
    expect(await deps.vaultRepo.get()).toBeNull();
  });
});
