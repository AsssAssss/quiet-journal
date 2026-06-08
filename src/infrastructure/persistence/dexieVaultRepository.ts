import Dexie, { type Table } from 'dexie';
import type { VaultConfig } from '@/domain/entities/Vault';
import type { IVaultRepository } from '@/domain/repositories/IVaultRepository';
import { logger } from '@/shared/logger';

class VaultDB extends Dexie {
  vault!: Table<VaultConfig, string>;
  constructor(name = 'quiet-journal-vault') {
    super(name);
    this.version(1).stores({ vault: 'id' });
  }
}

export class DexieVaultRepository implements IVaultRepository {
  private db: VaultDB;
  constructor(dbName?: string) {
    this.db = new VaultDB(dbName);
  }

  async get(): Promise<VaultConfig | null> {
    const v = await this.db.vault.get('main');
    logger.debug({ feature: 'repo.vault', action: 'get', resp: { hit: !!v } });
    return v ?? null;
  }

  async save(config: VaultConfig): Promise<void> {
    await this.db.vault.put(config);
    logger.debug({ feature: 'repo.vault', action: 'save' });
  }

  async remove(): Promise<void> {
    await this.db.vault.delete('main');
    logger.debug({ feature: 'repo.vault', action: 'remove' });
  }
}
