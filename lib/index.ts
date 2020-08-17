/** Modules **/
export { CoreModule as MTModule } from './core.module';

/** Constants **/
export {
  MT_OPTIONS,
  MT_HEADER_NAME,
  DEFAULT_TRANSPORT,
  DEFAULT_TENANT,
  DEFAULT_OPTIONS,
} from './constants';
export {
  TENANT_ENTITY_METADATA_FIELD,
  TENANT_SERVICE_METADATA_FIELD,
  TENANT_FIELD,
  ID_FIELD,
  DEFAULT_ENTITY_OPTIONS,
} from './decorators/constants';

/** Interfaces **/
export { Options as MTModuleOptions } from './interfaces/module.options';
export { AsyncOptions as MTModuleAsyncOptions } from './interfaces/module-async.options';
export { OptionsFactory as MTModuleOptionsFactory } from './interfaces/module-options.factory';

/** Services **/
export { CoreService as MTService } from './core.service';

/** Interceptors */
export { TenancyInterceptor } from './interceptors/tenancy.interceptor';

/** Decorators */
export {
  Entity as MTEntity,
  EntityOptions as MTEntityOptions,
} from './decorators/entity';

/** Internals */
export {
  TenantEntity,
  isTenantEntity,
  TenantTransport,
  TenancyEntityOptions,
  TenantContext,
  TenantEntityDto,
  TenancyScope,
} from './interfaces/core.interface';
export { Transport } from './transports/transport.interface';

/** Errors */
export { BaseError as MTError } from './errors/mtenant.error';
export { DecoratorError as MTDecoratorError } from './errors/decorator.error';
