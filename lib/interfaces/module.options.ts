import { TenantTransport, TenantGuard, TenantEntity } from './core.interface';
import { Storage } from './storage.interface';
import { Cache } from '../storages/cache/cache.interface';
import { CachedStorageOptions } from '../storages/cached.storage';

export interface Options {
  for: Array<TenantEntity | Function>; // Entities to handle
  transport?: TenantTransport; // Tenant transport: header
  headerName?: string; // Header name to extract tenant from (if transport=http specified)
  queryParameterName?: string; // Query parameter name to extract tenant from (if transport=http specified)
  defaultTenant?: string; // Tenant to assign by default
  allowTenant?: TenantGuard; // Allow certain requested tenant, augmented by tenant storage if setup
  allowMissingTenant?: boolean; // Get both IS NULL and tenant scopes on querying
  storage?: string | Storage<unknown>; // dynamic tenant storage (e.g. sequelize)
  storageSettingsDto?: any; // Tenant settings interface
  storageRepository?: any; // if database storage specified
  cache?: string | Cache; // if storage specified! dynamic policy storage cache (e.g. ioredis)
  cacheClient?: any; // if cache adapter specified
  cacheOptions?: CachedStorageOptions; // if cache adapter specified
  dataSource?: any; // TypeORM DataSource for automatic subscriber registration
}
