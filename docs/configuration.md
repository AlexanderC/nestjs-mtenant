---
layout: default
title: Configuration
---

# Configuration

## MTModuleOptions

Full interface exported as `MTModuleOptions`:

```typescript
interface MTModuleOptions {
  // Required
  for: Array<TenantEntity | Function>;

  // Transport
  transport?: TenantTransport;        // default: 'http'
  headerName?: string;                // default: 'X-Tenant-ID'
  queryParameterName?: string;        // default: 'tenant'

  // Tenant resolution
  defaultTenant?: string;             // default: 'root'
  allowTenant?: TenantGuard;          // (context, tenant) => boolean
  allowMissingTenant?: boolean;       // default: true

  // Storage
  storage?: string | Storage<unknown>; // 'sequelize' | 'typeorm' | custom instance
  storageSettingsDto?: any;            // DTO class for tenant settings shape
  storageRepository?: any;            // Sequelize Model or TypeORM entity class

  // Cache (requires storage to be set)
  cache?: string | Cache;              // 'ioredis' | custom instance
  cacheClient?: any;                   // IoRedis client instance
  cacheOptions?: CachedStorageOptions; // { expire?: number, prefix?: string }

  // TypeORM
  dataSource?: DataSource;            // registers TenantEntitySubscriber automatically
}
```

### Field reference

| Field | Default | Description |
|-------|---------|-------------|
| `for` | — | Array of entity/model classes decorated with `@MTEntity()`. The tenancy service is injected into each one at startup. |
| `transport` | `'http'` | How the tenant identifier is extracted from the request. Only `'http'` is supported. |
| `headerName` | `'X-Tenant-ID'` | HTTP header name read when `transport='http'`. |
| `queryParameterName` | `'tenant'` | Query string parameter read when `transport='http'` and `includeQuery=true` is used with `@MTApi()`. |
| `defaultTenant` | `'root'` | Tenant used when no header/query value is present. The default tenant is always allowed without a storage check. |
| `allowTenant` | `() => true` | Guard function called after the storage check (if storage is configured). Return `false` to reject the tenant. |
| `allowMissingTenant` | `true` | When `true`, read queries include rows where the tenant field is `NULL` in addition to the current tenant. |
| `storage` | `undefined` | Persistent storage for managing registered tenants. String values `'sequelize'` and `'typeorm'` select built-in adapters. |
| `storageSettingsDto` | `{}` | Class used as the type for the `settings` JSON column. Used only to guide TypeScript inference. |
| `storageRepository` | `undefined` | The Sequelize model or TypeORM entity class that backs the storage adapter. |
| `cache` | `undefined` | Cache layer over storage. `'ioredis'` selects the built-in adapter. |
| `cacheClient` | `undefined` | An initialised IoRedis `Redis` instance. |
| `cacheOptions` | `{ expire: 3600, prefix: 'MTENANT_PCACHE/' }` | Cache TTL in seconds and key prefix. |
| `dataSource` | `undefined` | TypeORM `DataSource`. When provided, `TenantEntitySubscriber` is registered automatically at startup. |

---

## forRoot()

Synchronous registration — all options are known at compile time.

```typescript
import { Module } from '@nestjs/common';
import { MTModule } from 'nestjs-mtenant';
import { User } from './models/user.model';
import { Book } from './models/book.model';

@Module({
  imports: [
    MTModule.forRoot({
      for: [User, Book],
      defaultTenant: 'public',
      allowMissingTenant: false,
    }),
  ],
})
export class AppModule {}
```

---

## forRootAsync()

Asynchronous registration — use when options depend on injected services (configuration, Redis client, etc.).

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MTModule, SEQUELIZE_STORAGE, IOREDIS_CACHE } from 'nestjs-mtenant';
import TenantsStorage from './models/tenants-storage.model';
import { User } from './models/user.model';
import { Book } from './models/book.model';
import { RedisService } from './redis/redis.service';

@Module({
  imports: [
    MTModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService, RedisService],
      useFactory: async (config: ConfigService, redis: RedisService) => ({
        for: [User, Book],
        storage: SEQUELIZE_STORAGE,
        storageRepository: TenantsStorage,
        cache: IOREDIS_CACHE,
        cacheClient: await redis.getClient(),
        cacheOptions: { expire: 600 }, // 10 minutes
      }),
    }),
  ],
})
export class AppModule {}
```

### useClass / useExisting

`forRootAsync` also supports `useClass` and `useExisting` for factory classes implementing `MTModuleOptionsFactory`:

```typescript
// tenancy-config.service.ts
import { Injectable } from '@nestjs/common';
import { MTModuleOptionsFactory, MTModuleOptions } from 'nestjs-mtenant';

@Injectable()
export class TenancyConfigService implements MTModuleOptionsFactory {
  createOptions(): MTModuleOptions {
    return {
      for: [User, Book],
    };
  }
}

// app.module.ts
MTModule.forRootAsync({
  useClass: TenancyConfigService,
})
```

---

## TenantGuard

The `allowTenant` option accepts a synchronous predicate:

```typescript
MTModule.forRoot({
  for: [User],
  allowTenant: (context, tenant) => {
    // context contains headers, query, url
    // return false to reject the tenant (throws 406 Not Acceptable)
    return tenant !== 'banned-tenant';
  },
})
```

When `storage` is configured, the guard is only called if the tenant already exists in storage. If the tenant is absent from storage, the request is rejected before reaching `allowTenant`.
