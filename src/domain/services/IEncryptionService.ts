import type { EncryptedBlob } from '../valueObjects/EncryptedBlob';

export interface IEncryptionService {
  /** 从主密码 + 盐派生 AES-GCM CryptoKey */
  deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey>;
  /** 生成新的 16 字节随机盐 */
  newSalt(): Uint8Array;
  /** 加密任意 UTF-8 字符串 */
  encrypt(plain: string, key: CryptoKey): Promise<EncryptedBlob>;
  /**
   * 解密；密钥错误或数据损坏抛出 EncryptionError。
   */
  decrypt(blob: EncryptedBlob, key: CryptoKey): Promise<string>;
}

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export class WrongPasswordError extends Error {
  constructor() {
    super('密码错误');
    this.name = 'WrongPasswordError';
  }
}
