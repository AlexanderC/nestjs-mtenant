/** Modules **/
export { MtenantModule as MTModule } from './mtenant.module';

/** Constants **/
export {
  SEQUELIZE_STORAGE,
  IOREDIS_CACHE,
  MT_SCOPE_KEY,
  MT_OPTIONS,
  MT_HEADER_NAME,
  MT_QUERY_PARAMETER_NAME,
  DEFAULT_TRANSPORT,
  DEFAULT_TENANT,
  DEFAULT_OPTIONS,
  DEFAULT_SETTINGS_DTO,
} from './constants';
export {
  DISABLE_TENANCY_OPTION,
  TENANCY_SERVICE_METADATA_FIELD,
  TENANT_ENTITY_METADATA_FIELD,
  TENANT_FIELD,
  ID_FIELD,
  DEFAULT_ENTITY_OPTIONS,
} from './decorators/constants';

/** Interfaces **/
export { Options as MTModuleOptions } from './interfaces/module.options';
export { AsyncOptions as MTModuleAsyncOptions } from './interfaces/module-async.options';
export { OptionsFactory as MTModuleOptionsFactory } from './interfaces/module-options.factory';

/** Services **/
export { MtenantService as MTService } from './mtenant.service';

/** Middlewares */
export { TenancyMiddleware } from './middlewares/tenancy.middleware';

/** Decorators */
export {
  Entity as MTEntity,
  EntityOptions as MTEntityOptions,
} from './decorators/entity';
export { Api as MTApi, ApiOptions as MTApiOptions } from './decorators/api';

/** Models **/
export { TenantsStorage as TenantsStorageSequelizeModel } from './storages/sequelize/storage.model';

/** Internals */
export {
  TenantEntity,
  isTenantEntity,
  TenantTransport,
  TenancyEntityOptions,
  TenantContext,
  TenantEntityDto,
  TenancyScope,
  TenantGuard,
} from './interfaces/core.interface';
export {
  Storage,
  TenantEntity as StoredTenantEntity,
} from './interfaces/storage.interface';
export { Transport } from './transports/transport.interface';
export { Cache } from './storages/cache/cache.interface';

/** Errors */
export { BaseError as MTError } from './errors/mtenant.error';
export { DecoratorError as MTDecoratorError } from './errors/decorator.error';
