import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('value 不变时初始不保存', () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderHook(({ v }) => useAutoSave({ value: v, save, delay: 100 }), {
      initialProps: { v: 'a' },
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('value 变化 debounce 后保存', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ v }) => useAutoSave({ value: v, save, delay: 100 }),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'b' });
    expect(result.current.status).toBe('pending');
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledWith('b');
    expect(result.current.status).toBe('saved');
  });

  it('连续变化只保存最后一次', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ v }) => useAutoSave({ value: v, save, delay: 100 }),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'b' });
    rerender({ v: 'c' });
    rerender({ v: 'd' });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('d');
  });

  it('save reject 进入 error', async () => {
    const save = vi.fn().mockRejectedValue(new Error('x'));
    const { result, rerender } = renderHook(
      ({ v }) => useAutoSave({ value: v, save, delay: 50 }),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'b' });
    await act(async () => {
      vi.advanceTimersByTime(50);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.status).toBe('error');
  });

  it('enabled=false 时不触发', () => {
    const save = vi.fn();
    const { rerender } = renderHook(
      ({ v }) => useAutoSave({ value: v, save, delay: 50, enabled: false }),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'b' });
    vi.advanceTimersByTime(100);
    expect(save).not.toHaveBeenCalled();
  });
});
