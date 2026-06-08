import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { logger } from '@/shared/logger';

/**
 * 跨平台安全存储抽象：
 *   - 原生 iOS/Android：@capacitor/preferences（底层 iOS Keychain / Android EncryptedSharedPreferences）
 *   - Web：localStorage（同源隔离）
 *
 * 用于 PB token、敏感配置等"中度敏感"信息。
 * 注意 vault 主密钥 *永远* 只在内存中持有，不进任何存储。
 */
export interface SecureStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

class WebSecureStorage implements SecureStorage {
  async get(key: string) {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }
  async set(key: string, value: string) {
    window.localStorage.setItem(key, value);
  }
  async remove(key: string) {
    window.localStorage.removeItem(key);
  }
}

class CapacitorSecureStorage implements SecureStorage {
  async get(key: string) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  }
  async set(key: string, value: string) {
    await Preferences.set({ key, value });
  }
  async remove(key: string) {
    await Preferences.remove({ key });
  }
}

export const secureStorage: SecureStorage = Capacitor.isNativePlatform()
  ? new CapacitorSecureStorage()
  : new WebSecureStorage();

logger.debug({
  feature: 'storage',
  action: 'init',
  resp: { platform: Capacitor.getPlatform() },
});
