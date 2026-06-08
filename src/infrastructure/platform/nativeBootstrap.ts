import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useVaultStore } from '@/presentation/state/vaultStore';
import { logger } from '@/shared/logger';

/**
 * 在原生平台启动时挂载若干生命周期 / 平台 API 集成。
 * Web 环境下为 no-op。
 */
export function bootstrapNative(): void {
  if (!Capacitor.isNativePlatform()) return;

  // 状态栏跟随当前主题
  syncStatusBar();
  // 监听 html.dark 变化
  if (typeof MutationObserver !== 'undefined') {
    const obs = new MutationObserver(syncStatusBar);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  // 进入后台 30 秒后自动锁定（如果 vault 已解锁）
  let bgTimer: ReturnType<typeof setTimeout> | null = null;
  CapApp.addListener('appStateChange', ({ isActive }) => {
    logger.debug({
      feature: 'native',
      action: 'app_state',
      req: { isActive },
    });
    if (isActive) {
      if (bgTimer) {
        clearTimeout(bgTimer);
        bgTimer = null;
      }
      return;
    }
    bgTimer = setTimeout(() => {
      const s = useVaultStore.getState();
      if (s.status === 'unlocked') {
        s.lock();
        logger.info({ feature: 'native', action: 'background_lock' });
      }
    }, 30_000);
  });

  // Android 物理返回键：交给浏览器历史栈
  CapApp.addListener('backButton', () => {
    if (window.history.length > 1) window.history.back();
    else void CapApp.exitApp();
  });
}

async function syncStatusBar(): Promise<void> {
  try {
    const dark = document.documentElement.classList.contains('dark');
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? '#15161A' : '#FAFAF7' });
  } catch (e) {
    // Android 颜色 API 可用；iOS 仅 setStyle 有效——忽略错误
    logger.debug({ feature: 'native', action: 'statusbar_skip', error: e });
  }
}
