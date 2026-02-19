---
layout: default
title: Storage & Caching
---

# Storage & Caching

Storage is optional. When configured, `MTModule` maintains a registry of known tenants. Unknown tenants are rejected before `allowTenant` is even called.

---

## Storage interface

Any object implementing the following interface can be passed as `storage`:

```typescript
interface Storage<T> {
  add(tenant: string, settings?: T): Promise<TenantEntity<T>>;
  remove(tenant: string): Promise<number>;
  exists(tenant: string): Promise<Boolean>;
  updateSettings(tenant: string, settings: T): Promise<TenantEntity<T>>;
  get(tenant?: string): Promise<TenantEntity<T> | Array<TenantEntity<T>>>;
}

interface TenantEntity<T> {
  tenant: string;
  settings: T;
}
```

`MTService.storage` exposes the configured storage instance so you can call it directly from application services.

---

## Sequelize storage

### Setup model

Extend `TenantsStorageSequelizeModel` to create your own storage model:

```typescript
// models/tenants-storage.model.ts
import { TenantsStorageSequelizeModel } from 'nestjs-mtenant';

export class TenantsStorage extends TenantsStorageSequelizeModel<TenantsStorage> {}
```

Register the model in your Sequelize connection, then reference it in `MTModule`:

```typescript
import { MTModule, SEQUELIZE_STORAGE } from 'nestjs-mtenant';

MTModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    for: [User, Book],
    storage: SEQUELIZE_STORAGE,
    storageRepository: TenantsStorage,
  }),
})
```

The `SEQUELIZE_STORAGE` constant equals the string `'sequelize'`.

### Table schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER | Primary key, auto-increment |
| `tenant` | VARCHAR | Unique, not null |
| `settings` | BLOB | Up to 64 KB of JSON |
| `createdAt` | DATETIME | Auto-managed |
| `updatedAt` | DATETIME | Auto-managed |
| `deletedAt` | DATETIME | Soft-delete (paranoid) |

---

## TypeORM storage

### Setup entity

Import and register `TenantsStorageTypeOrmEntity` in your `DataSource`:

```typescript
import { TenantsStorageTypeOrmEntity } from 'nestjs-mtenant';

const dataSource = new DataSource({
  entities: [User, Book, TenantsStorageTypeOrmEntity],
  // ...
});
```

Reference it in `MTModule`:

```typescript
import { MTModule, TYPEORM_STORAGE } from 'nestjs-mtenant';

MTModule.forRoot({
  for: [User, Book],
  storage: TYPEORM_STORAGE,
  storageRepository: TenantsStorageTypeOrmEntity,
  dataSource,
})
```

The `TYPEORM_STORAGE` constant equals the string `'typeorm'`.

### Table schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER | Primary key, auto-generated |
| `tenant` | VARCHAR | Unique, not null |
| `settings` | TEXT | JSON |
| `createdAt` | DATETIME | Auto-managed |
| `updatedAt` | DATETIME | Auto-managed |
| `deletedAt` | DATETIME | Soft-delete |

---

## Custom storage

Pass any object that satisfies the `Storage<T>` interface:

```typescript
import { Storage, TenantEntity } from 'nestjs-mtenant';

class InMemoryStorage<T> implements Storage<T> {
  private store = new Map<string, TenantEntity<T>>();

  async add(tenant: string, settings?: T): Promise<TenantEntity<T>> {
    const entry = { tenant, settings: settings ?? ({} as T) };
    this.store.set(tenant, entry);
    return entry;
  }

  async remove(tenant: string): Promise<number> {
    return this.store.delete(tenant) ? 1 : 0;
  }

  async exists(tenant: string): Promise<boolean> {
    return this.store.has(tenant);
  }

  async updateSettings(tenant: string, settings: T): Promise<TenantEntity<T>> {
    const entry = { tenant, settings };
    this.store.set(tenant, entry);
    return entry;
  }

  async get(tenant?: string) {
    if (tenant) return this.store.get(tenant)!;
    return [...this.store.values()];
  }
}

MTModule.forRoot({
  for: [User],
  storage: new InMemoryStorage(),
})
```

---

## IoRedis caching

Add a caching layer over any storage backend to avoid hitting the database on every request. The cache stores `exists` and `get` results keyed by tenant name.

### Setup

```typescript
import { MTModule, SEQUELIZE_STORAGE, IOREDIS_CACHE } from 'nestjs-mtenant';
import IORedis from 'ioredis';

MTModule.forRootAsync({
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => ({
    for: [User, Book],
    storage: SEQUELIZE_STORAGE,
    storageRepository: TenantsStorage,
    cache: IOREDIS_CACHE,
    cacheClient: new IORedis({ host: config.get('REDIS_HOST') }),
    cacheOptions: {
      expire: 600,                     // TTL in seconds (default: 3600)
      prefix: 'MY_APP_MTENANT_CACHE/', // key prefix (default: 'MTENANT_PCACHE/')
    },
  }),
})
```

The `IOREDIS_CACHE` constant equals the string `'ioredis'`.

### Cache invalidation

The cache is invalidated automatically on `add()`, `remove()`, and `updateSettings()`. You do not need to manage cache keys manually.

---

## Custom cache

Implement the `Cache` interface to plug in any caching backend:

```typescript
import { Cache } from 'nestjs-mtenant';

class NodeCacheAdapter implements Cache {
  constructor(private readonly client: NodeCache) {}

  set(key: string, value: string, expire?: number): boolean {
    return this.client.set(key, value, expire ?? 0);
  }

  has(key: string): boolean {
    return this.client.has(key);
  }

  get(key: string): string {
    return this.client.get<string>(key) ?? '';
  }

  remove(key: string): boolean {
    this.client.del(key);
    return true;
  }
}

MTModule.forRoot({
  for: [User],
  storage: SEQUELIZE_STORAGE,
  storageRepository: TenantsStorage,
  cache: new NodeCacheAdapter(new NodeCache()),
})
```

---

## Using storage from application code

Inject `MTService` to interact with the tenant registry from your own services:

```typescript
import { Injectable } from '@nestjs/common';
import { MTService, StoredTenantEntity } from 'nestjs-mtenant';
import { TenantSettingsDto } from './tenant-settings.dto';

@Injectable()
export class TenancyService {
  constructor(private readonly mt: MTService) {}

  add(tenant: string, settings: TenantSettingsDto) {
    return this.mt.storage.add(tenant, settings);
  }

  remove(tenant: string) {
    return this.mt.storage.remove(tenant);
  }

  exists(tenant: string) {
    return this.mt.storage.exists(tenant);
  }

  get(tenant?: string) {
    return this.mt.storage.get(tenant);
  }

  updateSettings(tenant: string, settings: TenantSettingsDto) {
    return this.mt.storage.updateSettings(tenant, settings);
  }
}
```
