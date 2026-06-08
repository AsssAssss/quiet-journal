import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEntry, updateEntry } from '@/domain/entities/Entry';
import { useSearch } from './useSearch';

describe('useSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('空 query 返回空命中且 active=false', () => {
    const entries = [createEntry({ title: 'a' })];
    const { result } = renderHook(() => useSearch({ entries, query: '', delay: 50 }));
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current.hits).toEqual([]);
    expect(result.current.active).toBe(false);
  });

  it('debounce 后返回命中', async () => {
    const entries = [
      updateEntry(createEntry({ title: '搜索功能', now: 1 }), {
        plainText: '搜索测试',
        now: 2,
      }),
      updateEntry(createEntry({ title: '其他', now: 3 }), {
        plainText: '别的',
        now: 4,
      }),
    ];
    const { result, rerender } = renderHook(
      ({ q }) => useSearch({ entries, query: q, delay: 50 }),
      { initialProps: { q: '' } },
    );
    rerender({ q: '搜索' });
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current.hits.length).toBeGreaterThan(0);
    expect(result.current.hits[0]!.entry.title).toBe('搜索功能');
    expect(result.current.active).toBe(true);
  });
});
