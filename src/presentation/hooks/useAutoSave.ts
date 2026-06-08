import { useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface AutoSaveOptions<T> {
  value: T;
  /** 当 value 引用变化时，等多少毫秒后触发保存。默认 800。 */
  delay?: number;
  /** 真正执行保存。返回 promise；reject 进入 error 状态。 */
  save: (value: T) => Promise<void>;
  /** 是否禁用 */
  enabled?: boolean;
}

/**
 * 通用自动保存 hook：value 引用变化 -> debounce -> save。
 */
export function useAutoSave<T>({ value, delay = 800, save, enabled = true }: AutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await saveRef.current(value);
        setStatus('saved');
        setSavedAt(Date.now());
      } catch {
        setStatus('error');
      }
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay, enabled]);

  return { status, savedAt };
}
