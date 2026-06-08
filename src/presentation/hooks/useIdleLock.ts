import { useEffect, useRef } from 'react';
import { useVaultStore } from '@/presentation/state/vaultStore';

const STORAGE_KEY = 'quiet:idle-lock-ms';
/** 默认 15 分钟；0 = 关闭 */
export const DEFAULT_IDLE_MS = 15 * 60 * 1000;

export function getIdleLockMs(): number {
  if (typeof window === 'undefined') return DEFAULT_IDLE_MS;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === null) return DEFAULT_IDLE_MS;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_IDLE_MS;
}

export function setIdleLockMs(ms: number): void {
  window.localStorage.setItem(STORAGE_KEY, String(ms));
}

/** 监听用户活动；空闲超过阈值且已解锁时自动 lock。0 = 关闭。 */
export function useIdleLock() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const ms = getIdleLockMs();
      if (ms <= 0) return;
      timerRef.current = setTimeout(() => {
        const { status, lock } = useVaultStore.getState();
        if (status === 'unlocked') lock();
      }, ms);
    };

    const events = ['mousemove', 'keydown', 'pointerdown', 'visibilitychange'];
    for (const ev of events) window.addEventListener(ev, reset, { passive: true });
    reset();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const ev of events) window.removeEventListener(ev, reset);
    };
  }, []);
}
