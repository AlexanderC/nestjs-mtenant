import { TenantEntity, Storage } from '../interfaces/storage.interface';

export class TypeOrmStorage<T> implements Storage<T> {
  constructor(private readonly storageRepository: any) {}

  async add(tenant: string, settings?: T): Promise<TenantEntity<T>> {
    const entity = this.storageRepository.create({
      tenant,
      settings: this.encode(settings),
    });
    const saved = await this.storageRepository.save(entity);
    return { tenant: saved.tenant, settings };
  }

  async remove(tenant: string): Promise<number> {
    const result = await this.storageRepository.delete({ tenant });
    return result.affected || 0;
  }

  async exists(tenant: string): Promise<Boolean> {
    return (await this.storageRepository.count({ where: { tenant } })) > 0;
  }

  async updateSettings(tenant: string, settings: T): Promise<TenantEntity<T>> {
    await this.storageRepository.update(
      { tenant },
      { settings: this.encode(settings) },
    );
    return { tenant, settings };
  }

  async get(
    tenant?: string,
  ): Promise<TenantEntity<T> | Array<TenantEntity<T>>> {
    if (!tenant) {
      const entries = await this.storageRepository.find({
        select: ['tenant', 'settings'],
      });

      return entries.map((entry: any) => ({
        tenant: entry.tenant,
        settings: this.decode(entry.settings),
      }));
    }

    const entry = await this.storageRepository.findOne({
      where: { tenant },
      select: ['tenant', 'settings'],
    });

    if (!entry) {
      return { tenant, settings: null };
    }

    return {
      tenant: entry.tenant,
      settings: this.decode(entry.settings),
    };
  }

  private encode(settings: T): string {
    return settings ? JSON.stringify(settings) : null;
  }

  private decode(rawSettings: string): T {
    return rawSettings ? JSON.parse(rawSettings.toString()) : null;
  }
}
