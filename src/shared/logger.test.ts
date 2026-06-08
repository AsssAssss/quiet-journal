import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, newRequestId } from './logger';

describe('logger', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('未开启 debug 时不输出 debug 日志', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.debug({ feature: 'x', action: 'y' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('开启 debug 后输出 JSON 行', () => {
    window.localStorage.setItem('quiet:debug', '1');
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.debug({ feature: 'x', action: 'y', requestId: 'r1', req: { a: 1 } });
    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('debug');
    expect(parsed.feature).toBe('x');
    expect(parsed.requestId).toBe('r1');
  });

  it('info/warn/error 始终输出', () => {
    const i = vi.spyOn(console, 'info').mockImplementation(() => {});
    const w = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const e = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.info({ feature: 'f', action: 'a' });
    logger.warn({ feature: 'f', action: 'a' });
    logger.error({ feature: 'f', action: 'a', error: new Error('boom') });
    expect(i).toHaveBeenCalled();
    expect(w).toHaveBeenCalled();
    expect(e).toHaveBeenCalled();
    const errLine = JSON.parse(e.mock.calls[0][0] as string);
    expect(errLine.error.message).toBe('boom');
  });

  it('newRequestId 返回唯一字符串', () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
    expect(typeof a).toBe('string');
  });

  it('newRequestId 在没有 crypto.randomUUID 时回退', () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: { ...original, randomUUID: undefined },
      configurable: true,
    });
    const id = newRequestId();
    expect(id.startsWith('req-')).toBe(true);
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  });
});
