import { describe, expect, it } from 'vitest';
import { err, ok, type Result } from './result';

describe('Result', () => {
  it('ok 包装值', () => {
    const r: Result<number> = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });
  it('err 包装错误', () => {
    const r = err(new Error('x'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('x');
  });
});
