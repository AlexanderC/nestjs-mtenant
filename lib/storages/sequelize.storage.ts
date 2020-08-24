import { TenantEntity, Storage } from '../interfaces/storage.interface';

export class SequelizeStorage<T> implements Storage<T> {
  constructor(private readonly storageRepository: any) {}

  async add(tenant: string, settings?: T): Promise<TenantEntity<T>> {
    return <TenantEntity<T>>this.storageRepository.create({
      tenant,
      settings: this.encode(settings),
    });
  }

  async remove(tenant: string): Promise<number> {
    return this.storageRepository.destroy({ where: { tenant } });
  }

  async exists(tenant: string): Promise<Boolean> {
    return (await this.storageRepository.count({ where: { tenant } })) > 0;
  }

  async updateSettings(tenant: string, settings: T): Promise<TenantEntity<T>> {
    await (<TenantEntity<T>>(
      this.storageRepository.update(
        { settings: this.encode(settings) },
        { where: { tenant } },
      )
    ));
    return { tenant, settings };
  }

  async get(
    tenant?: string,
  ): Promise<TenantEntity<T> | Array<TenantEntity<T>>> {
    if (!tenant) {
      const entries = await (<Array<TenantEntity<T>>>(
        this.storageRepository.findAll({ attributes: ['tenant', 'settings'] })
      ));

      return entries.map((entry) => {
        const { tenant, settings } = entry;
        return { tenant, settings: this.decode((<any>settings) as string) };
      });
    }

    const { settings } = await (<TenantEntity<T>>(
      this.storageRepository.findOne({
        where: { tenant },
        attributes: ['settings'],
      })
    ));

    return { tenant, settings: this.decode((<any>settings) as string) };
  }

  private encode(settings: T): string {
    return settings ? JSON.stringify(settings) : null;
  }

  private decode(rawSettings: string): T {
    return rawSettings ? JSON.parse(rawSettings.toString()) : null;
  }
}
