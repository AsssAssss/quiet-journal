import { useEffect } from 'react';

export interface ShortcutBinding {
  /** 真实判断函数；返回 true 即触发 */
  match: (e: KeyboardEvent) => boolean;
  /** 触发动作 */
  run: (e: KeyboardEvent) => void;
  /** 是否阻止默认行为 */
  preventDefault?: boolean;
}

/** 在编辑器/输入框内时不应触发这些快捷键 */
function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (t.isContentEditable) return true;
  return false;
}

export function useShortcuts(bindings: ShortcutBinding[], allowInTyping = false) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!allowInTyping && isTypingTarget(e.target)) {
        // 命令面板触发键仍然允许（命令面板自己处理 typing 后的输入）
        // 这里默认禁用，外层可通过 allowInTyping=true 关闭过滤
        return;
      }
      for (const b of bindings) {
        if (b.match(e)) {
          if (b.preventDefault !== false) e.preventDefault();
          b.run(e);
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bindings, allowInTyping]);
}

/** 常见 modifier 判定 */
export const mod = (e: KeyboardEvent) => e.metaKey || e.ctrlKey;
