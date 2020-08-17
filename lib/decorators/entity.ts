import {
  DEFAULT_ENTITY_OPTIONS,
  TENANT_ENTITY_METADATA_FIELD,
  TENANT_SERVICE_METADATA_FIELD,
} from './constants';
import {
  TenancyEntityOptions,
  TenantEntity,
} from '../interfaces/core.interface';
import { enhanceTenantEntity } from './tenant.entity';

export interface EntityOptions {
  tenantField?: string;
  idField?: string;
}

export function isTenantEntity(target: unknown): target is TenantEntity {
  return (
    Reflect.hasMetadata(TENANT_ENTITY_METADATA_FIELD, target) &&
    Reflect.getMetadata(TENANT_ENTITY_METADATA_FIELD, target) === true
  );
}

export function getTenantService(target: Function): any {
  if (!Reflect.hasMetadata(TENANT_SERVICE_METADATA_FIELD, target)) {
    return null;
  }

  return Reflect.getMetadata(TENANT_SERVICE_METADATA_FIELD, target);
}

export function setTenantService(target: Function, service: any): Function {
  Reflect.defineMetadata(TENANT_SERVICE_METADATA_FIELD, service, target);
  return target;
}

/**
 * @use @Entity()
 *      @Entity({ tenantField?: 'tenant', idField?: 'id' })
 */
export function Entity(options?: EntityOptions): ClassDecorator {
  return (target: Function) => {
    const tenancyOptions: TenancyEntityOptions = Object.assign(
      {},
      DEFAULT_ENTITY_OPTIONS,
      options || {},
    );

    /** Simple and fast way to know if the model is extended */
    Reflect.defineMetadata(TENANT_ENTITY_METADATA_FIELD, true, target);

    /** Implement TenantEntity */
    target.prototype.isTenant = function (): boolean {
      return true;
    };
    target.prototype.getTenancyOptions = function (): TenancyEntityOptions {
      return tenancyOptions;
    };
    target.prototype.getTenant = function (): string {
      return this[tenancyOptions.tenantField];
    };
    target.prototype.getTenantId = function (): string {
      const tenant = this.getTenant();
      const id = this[tenancyOptions.idField];

      return `${tenant}/${id}`;
    };

    /** Add hooks */
    enhanceTenantEntity(target, tenancyOptions);
  };
}
