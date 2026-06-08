import {
  EncryptionError,
  type IEncryptionService,
} from '@/domain/services/IEncryptionService';
import type { EncryptedBlob } from '@/domain/valueObjects/EncryptedBlob';
import { logger } from '@/shared/logger';
import { base64ToBytes, bytesToBase64 } from './base64';

const ENC = new TextEncoder();
const DEC = new TextDecoder();

export class WebCryptoEncryptionService implements IEncryptionService {
  newSalt(): Uint8Array {
    const s = new Uint8Array(16);
    crypto.getRandomValues(s);
    return s;
  }

  async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number,
  ): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      ENC.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  async encrypt(plain: string, key: CryptoKey): Promise<EncryptedBlob> {
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ENC.encode(plain),
    );
    return {
      iv: bytesToBase64(iv),
      cipher: bytesToBase64(new Uint8Array(cipher)),
      v: 1,
    };
  }

  async decrypt(blob: EncryptedBlob, key: CryptoKey): Promise<string> {
    try {
      const iv = base64ToBytes(blob.iv);
      const cipher = base64ToBytes(blob.cipher);
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        key,
        cipher as unknown as BufferSource,
      );
      return DEC.decode(plain);
    } catch (e) {
      logger.warn({ feature: 'crypto', action: 'decrypt_fail', error: e });
      throw new EncryptionError('decrypt failed');
    }
  }
}
