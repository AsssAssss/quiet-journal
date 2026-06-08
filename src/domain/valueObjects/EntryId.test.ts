import { describe, expect, it } from 'vitest';
import { newEntryId } from './EntryId';

describe('EntryId', () => {
  it('生成唯一 id', () => {
    const a = newEntryId();
    const b = newEntryId();
    expect(a).not.toBe(b);
  });

  it('crypto.randomUUID 不存在时回退到时间戳前缀', () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: { ...original, randomUUID: undefined },
      configurable: true,
    });
    const id = newEntryId();
    expect(id.startsWith('e-')).toBe(true);
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  });
});
