import { Inject } from '@nestjs/common';
import {
  DEFAULT_ENTITY_OPTIONS,
  TENANT_ENTITY_METADATA_FIELD,
} from './constants';
import {
  TenancyEntityOptions,
  TenantEntity,
} from '../interfaces/core.interface';
import { enhanceTenantEntity } from './tenant.entity';
import { CoreService } from '../core.service';

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

/**
 * @use @Entity()
 *      @Entity({ tenantField?: 'tenant', idField?: 'id' })
 */
export function Entity(options?: EntityOptions): ClassDecorator {
  return (target: Function) => {
    const service = <CoreService>(<any>Inject(CoreService));
    const tenancyOptions: TenancyEntityOptions = Object.assign(
      {},
      DEFAULT_ENTITY_OPTIONS,
      options || {},
    );

    /** Simple and fast way to know if the model is extended */
    Reflect.defineMetadata(TENANT_ENTITY_METADATA_FIELD, true, target);

    /** Implement TenantEntity */
    target.prototype.getTenant = function (): string {
      return this[tenancyOptions.tenantField];
    };
    target.prototype.getTenantId = function (): string {
      const tenant = this.getTenant();
      const id = this[tenancyOptions.idField];

      return `${tenant}/${id}`;
    };

    /** Add hooks */
    enhanceTenantEntity(target, tenancyOptions, service);
  };
}
