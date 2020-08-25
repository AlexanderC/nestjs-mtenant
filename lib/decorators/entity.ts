import { Model } from 'sequelize-typescript';
import {
  DEFAULT_ENTITY_OPTIONS,
  TENANT_ENTITY_METADATA_FIELD,
  TENANCY_SERVICE_METADATA_FIELD,
} from './constants';
import {
  TenancyEntityOptions,
  TenantEntity,
} from '../interfaces/core.interface';
import { enhanceTenantEntity } from './tenant.entity';
import { MtenantService } from '../mtenant.service';

export interface EntityOptions {
  tenantField?: string;
  idField?: string;
}

export function isTenantEntity(target: unknown): target is TenantEntity {
  return (
    typeof target === typeof Model &&
    Reflect.hasMetadata(TENANT_ENTITY_METADATA_FIELD, target) &&
    Reflect.getMetadata(TENANT_ENTITY_METADATA_FIELD, target) === true
  );
}

export function injectTenancyService(
  target: TenantEntity,
  service: MtenantService,
): void {
  Reflect.defineMetadata(TENANCY_SERVICE_METADATA_FIELD, service, target);
}

export function getTenancyService(target: TenantEntity): MtenantService {
  return Reflect.hasMetadata(TENANCY_SERVICE_METADATA_FIELD, target)
    ? Reflect.getMetadata(TENANCY_SERVICE_METADATA_FIELD, target)
    : null;
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

    // Implement TenantEntity
    Object.defineProperty(target, 'switchTenancy', {
      value: (state: boolean): void => {
        Reflect.defineMetadata(TENANT_ENTITY_METADATA_FIELD, state, target);
      },
      writable: false,
    });
    target.prototype.getTenant = function (): string {
      return this[tenancyOptions.tenantField];
    };
    target.prototype.getTenantId = function (): string {
      const tenant = this.getTenant();
      const id = this[tenancyOptions.idField];

      return `${tenant}/${id}`;
    };

    // Add hooks
    enhanceTenantEntity(target as typeof Model, tenancyOptions);

    // enable tenancy by default
    ((<any>target) as TenantEntity).switchTenancy(true);
  };
}
