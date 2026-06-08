import { describe, expect, it } from 'vitest';
import { EncryptionError } from '@/domain/services/IEncryptionService';
import { WebCryptoEncryptionService } from './webCryptoEncryptionService';

const PWD = 'correct-horse-battery-staple';
const ITER = 50_000; // 测试中降低迭代加速

describe('WebCryptoEncryptionService', () => {
  it('加密 -> 解密 往返一致', async () => {
    const svc = new WebCryptoEncryptionService();
    const salt = svc.newSalt();
    const key = await svc.deriveKey(PWD, salt, ITER);
    const blob = await svc.encrypt('hello 你好', key);
    expect(blob.v).toBe(1);
    expect(blob.iv.length).toBeGreaterThan(0);
    expect(blob.cipher.length).toBeGreaterThan(0);
    const plain = await svc.decrypt(blob, key);
    expect(plain).toBe('hello 你好');
  });

  it('错误密钥解密抛 EncryptionError', async () => {
    const svc = new WebCryptoEncryptionService();
    const salt = svc.newSalt();
    const key1 = await svc.deriveKey(PWD, salt, ITER);
    const key2 = await svc.deriveKey('wrong', salt, ITER);
    const blob = await svc.encrypt('secret', key1);
    await expect(svc.decrypt(blob, key2)).rejects.toBeInstanceOf(EncryptionError);
  });

  it('newSalt 每次不同', () => {
    const svc = new WebCryptoEncryptionService();
    const a = svc.newSalt();
    const b = svc.newSalt();
    expect(Array.from(a)).not.toEqual(Array.from(b));
    expect(a.length).toBe(16);
  });

  it('每次 encrypt 的 iv 不同', async () => {
    const svc = new WebCryptoEncryptionService();
    const salt = svc.newSalt();
    const key = await svc.deriveKey(PWD, salt, ITER);
    const a = await svc.encrypt('same', key);
    const b = await svc.encrypt('same', key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.cipher).not.toBe(b.cipher);
  });
});
