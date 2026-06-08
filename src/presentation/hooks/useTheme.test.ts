import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('已存储 light 时使用存储值', () => {
    window.localStorage.setItem('quiet:theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('已存储 dark 时使用存储值并加上 dark class', () => {
    window.localStorage.setItem('quiet:theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('未存储时，系统偏好为 dark 则返回 dark', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
      matches: q.includes('dark'),
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('toggle 在 light 与 dark 间切换并写入 localStorage', () => {
    const { result } = renderHook(() => useTheme());
    const initial = result.current.theme;
    act(() => result.current.toggle());
    expect(result.current.theme).not.toBe(initial);
    expect(window.localStorage.getItem('quiet:theme')).toBe(result.current.theme);
    act(() => result.current.toggle());
    expect(result.current.theme).toBe(initial);
  });

  it('setTheme 直接设置', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    act(() => result.current.setTheme('light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('未存储时跟随系统偏好变化', () => {
    let listener: ((e: MediaQueryListEvent) => void) | undefined;
    vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => {
        listener = l;
      },
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList);

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    act(() => listener?.({ matches: true } as MediaQueryListEvent));
    expect(result.current.theme).toBe('dark');
  });

  it('已存储偏好时忽略系统变化', () => {
    window.localStorage.setItem('quiet:theme', 'light');
    let listener: ((e: MediaQueryListEvent) => void) | undefined;
    vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => {
        listener = l;
      },
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList);

    const { result } = renderHook(() => useTheme());
    act(() => listener?.({ matches: true } as MediaQueryListEvent));
    expect(result.current.theme).toBe('light');
  });
});
