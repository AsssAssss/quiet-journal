import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mod, useShortcuts } from './useShortcuts';

describe('useShortcuts', () => {
  it('匹配的绑定被触发', () => {
    const run = vi.fn();
    renderHook(() =>
      useShortcuts([
        { match: (e) => mod(e) && e.key === 'k', run },
      ]),
    );
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    expect(run).toHaveBeenCalled();
  });

  it('未匹配的绑定不被触发', () => {
    const run = vi.fn();
    renderHook(() =>
      useShortcuts([
        { match: (e) => mod(e) && e.key === 'k', run },
      ]),
    );
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    expect(run).not.toHaveBeenCalled();
  });

  it('在 input 中默认不触发', () => {
    const run = vi.fn();
    renderHook(() =>
      useShortcuts([
        { match: (e) => mod(e) && e.key === 'n', run },
      ]),
    );
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'n', metaKey: true, bubbles: true }),
    );
    expect(run).not.toHaveBeenCalled();
    input.remove();
  });

  it('allowInTyping=true 时即使在输入框也触发', () => {
    const run = vi.fn();
    renderHook(() =>
      useShortcuts(
        [{ match: (e) => mod(e) && e.key === 'k', run }],
        true,
      ),
    );
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
    );
    expect(run).toHaveBeenCalled();
    input.remove();
  });
});
