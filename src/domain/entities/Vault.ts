import type { EncryptedBlob } from '../valueObjects/EncryptedBlob';

/**
 * Vault 持久化配置（一个用户只有一个）。
 * 不保存明文密码或主密钥；只存派生参数 + 可验证 ciphertext。
 */
export interface VaultConfig {
  id: 'main';
  enabled: boolean;
  /** PBKDF2 盐，base64（16 字节） */
  salt: string;
  /** PBKDF2 迭代次数 */
  iterations: number;
  /**
   * verifier：用主密钥加密的一段固定明文（如 'quiet-vault-v1'）。
   * 解锁时尝试解密并比对明文，匹配则视为密码正确。
   */
  verifier: EncryptedBlob;
  createdAt: number;
  updatedAt: number;
}

/** 解锁后内存中的运行态，主密钥仅保留为 CryptoKey 引用 */
export interface UnlockedVault {
  key: CryptoKey;
  unlockedAt: number;
}

export const VAULT_VERIFIER_PLAINTEXT = 'quiet-vault-v1';
