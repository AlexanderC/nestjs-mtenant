import {
  DEFAULT_ENTITY_OPTIONS,
  TENANT_ENTITY_METADATA_FIELD,
  TENANT_ENTITY_OPTIONS_METADATA_FIELD,
  TENANCY_SERVICE_METADATA_FIELD,
} from './constants';
import {
  TenancyEntityOptions,
  TenantEntity,
} from '../interfaces/core.interface';
import { MtenantService } from '../mtenant.service';

// Lazy detection of Sequelize
let SequelizeModel: any = null;
let enhanceSequelizeTenantEntity: any = null;
try {
  SequelizeModel = require('sequelize-typescript').Model;
  enhanceSequelizeTenantEntity =
    require('./sequelize/tenant.entity').enhanceTenantEntity;
} catch (e) {
  // Sequelize not installed — TypeORM-only mode
}

export interface EntityOptions {
  tenantField?: string;
  idField?: string;
}

export function isTenantEntityMetadata(target: unknown): boolean {
  return (
    Reflect.hasMetadata(TENANT_ENTITY_METADATA_FIELD, target) &&
    Reflect.getMetadata(TENANT_ENTITY_METADATA_FIELD, target) === true
  );
}

export function isTenantEntity(target: unknown): target is TenantEntity {
  return isTenantEntityMetadata(target);
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

function isSequelizeModel(target: Function): boolean {
  if (!SequelizeModel) return false;
  try {
    return (
      target.prototype instanceof SequelizeModel || target === SequelizeModel
    );
  } catch {
    return false;
  }
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

    // Store tenancy options as metadata (used by TypeORM subscriber)
    Reflect.defineMetadata(
      TENANT_ENTITY_OPTIONS_METADATA_FIELD,
      tenancyOptions,
      target,
    );

    // Implement TenantEntity interface
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

    // ORM-specific enhancement
    if (isSequelizeModel(target)) {
      // Sequelize: register hooks on the Model class
      enhanceSequelizeTenantEntity(target, tenancyOptions);
    }
    // TypeORM: no hooks to register here.
    // The TenantEntitySubscriber reads metadata at runtime.

    // enable tenancy by default
    ((<any>target) as TenantEntity).switchTenancy(true);
  };
}
