import type { VaultConfig } from '../entities/Vault';

export interface IVaultRepository {
  get(): Promise<VaultConfig | null>;
  save(config: VaultConfig): Promise<void>;
  /** 完全移除 vault 配置（关闭私密模式） */
  remove(): Promise<void>;
}
