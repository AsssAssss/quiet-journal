import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { secureStorage } from './secureStorage';

// 在 Web 测试环境（jsdom）下，secureStorage 应使用 localStorage 后端
describe('secureStorage (web 后端)', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it('set / get 往返', async () => {
    await secureStorage.set('k1', 'v1');
    expect(await secureStorage.get('k1')).toBe('v1');
  });

  it('get 不存在返回 null', async () => {
    expect(await secureStorage.get('nope')).toBeNull();
  });

  it('remove 删除键', async () => {
    await secureStorage.set('k', 'v');
    await secureStorage.remove('k');
    expect(await secureStorage.get('k')).toBeNull();
  });
});
