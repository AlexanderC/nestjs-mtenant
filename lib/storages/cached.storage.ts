import { Cache } from './cache/cache.interface';
import { CacheError } from './cache/cache.error';
import { TenantEntity, Storage } from '../interfaces/storage.interface';

export interface CachedStorageOptions {
  expire?: number; // in seconds
  prefix?: string;
}

enum CachedOp {
  EXISTS = 'exists',
  GET = 'get',
}

export class CachedStorage<T> implements Storage<T> {
  readonly readonly: boolean = false;
  readonly DEFAULT_OPTIONS = <CachedStorageOptions>{
    expire: 3600, // 1 hour
    prefix: 'MTENANT_PCACHE/',
  };

  constructor(
    public readonly storage: Storage<T>,
    public readonly cache: Cache,
    public options?: CachedStorageOptions,
  ) {
    if (!options) {
      this.options = this.DEFAULT_OPTIONS;
    }

    this.options = !options
      ? this.DEFAULT_OPTIONS
      : Object.assign({}, this.DEFAULT_OPTIONS, this.options);
  }

  async add(tenant: string, settings?: T): Promise<TenantEntity<T>> {
    await this.purgeCache(tenant);
    return this.storage.add(tenant, settings);
  }

  async remove(tenant: string): Promise<number> {
    await this.purgeCache(tenant);
    return this.storage.remove(tenant);
  }

  async exists(tenant: string): Promise<Boolean> {
    const key = this.key(tenant, CachedOp.EXISTS);

    if (await this.cache.has(key)) {
      return this.decode(await this.cache.get(key));
    }

    const result = await this.storage.exists(tenant);

    if (
      !(await this.cache.set(key, this.encode(result), this.options.expire))
    ) {
      throw new CacheError(`Unable to store tenant cache for key=${key}`);
    }

    return result;
  }

  async updateSettings(tenant: string, settings: T): Promise<TenantEntity<T>> {
    await this.purgeCache(tenant, CachedOp.GET);
    return this.storage.updateSettings(tenant, settings);
  }

  async get(
    tenant?: string,
  ): Promise<TenantEntity<T> | Array<TenantEntity<T>>> {
    const key = this.key(tenant, CachedOp.GET);

    if (await this.cache.has(key)) {
      return this.decode(await this.cache.get(key));
    }

    const result = await this.storage.get(tenant);

    if (
      !(await this.cache.set(key, this.encode(result), this.options.expire))
    ) {
      throw new CacheError(`Unable to store tenant cache for key=${key}`);
    }

    return result;
  }

  private async purgeCache(tenant: string, op?: CachedOp): Promise<void> {
    const ops = op ? [op] : [CachedOp.GET, CachedOp.EXISTS];

    for (const oneOp of ops) {
      const key = this.key(tenant, oneOp);

      if (await this.cache.has(key)) {
        if (!(await this.cache.remove(key))) {
          throw new CacheError(`Unable to remove tenant cache for key=${key}`);
        }
      }
    }
  }

  private encode(value: any): string {
    return JSON.stringify(value);
  }

  private decode(rawValue: string): any {
    return JSON.parse(rawValue);
  }

  private key(tenant: string, op: string): string {
    return `${this.options.prefix}${tenant}$${op}`;
  }
}
