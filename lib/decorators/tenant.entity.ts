import * as Sequelize from 'sequelize';
import { TenancyEntityOptions } from '../interfaces/core.interface';
import { isTenantEntity } from './entity';
import { DecoratorError } from '../errors/decorator.error';
import { CoreService } from '../core.service';

function injectInstanceWithTenantProperty(
  instance: any,
  target: Function,
  tenancyOptions: TenancyEntityOptions,
  service: CoreService,
): void {
  if (!isTenantEntity(target)) {
    return;
  }

  // apply only if tenancy field value is missing or empty
  if (!instance[tenancyOptions.tenantField]) {
    instance[tenancyOptions.tenantField] = service.tenancyScope.tenant;
  }
}

function injectQueryScopeWithTenantProperty(
  options: any,
  target: Function,
  tenancyOptions: TenancyEntityOptions,
  service: CoreService,
): void {
  if (!isTenantEntity(target)) {
    return;
  }

  // apply only tenancy filter option value is missing or empty
  if (!((options || {}).where || {})[tenancyOptions.tenantField]) {
    options = options || {};
    options.where = options.where || {};
    options.where[tenancyOptions.tenantField] = service.tenancyOptions
      .allowMissingTenant
      ? { [Sequelize.Op.in]: [service.tenancyScope.tenant, null] }
      : service.tenancyScope.tenant;
  }
}

export function beforeCreate(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
  service: CoreService,
): Function {
  return (instance): void => {
    injectInstanceWithTenantProperty(instance, target, tenancyOptions, service);
  };
}

export function beforeBulkCreate(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
  service: CoreService,
): Function {
  return (instances): void => {
    for (const instance of instances) {
      injectInstanceWithTenantProperty(
        instance,
        target,
        tenancyOptions,
        service,
      );
    }
  };
}

export function beforeUpdate(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
  service: CoreService,
): Function {
  return (instance): void => {
    injectInstanceWithTenantProperty(instance, target, tenancyOptions, service);
  };
}

export function beforeBulkUpdate(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
  service: CoreService,
): Function {
  return (options): void => {
    injectQueryScopeWithTenantProperty(
      options,
      target,
      tenancyOptions,
      service,
    );
  };
}

export function beforeDestroy(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
  service: CoreService,
): Function {
  return (instance): void => {
    injectInstanceWithTenantProperty(instance, target, tenancyOptions, service);
  };
}

export function beforeBulkDestroy(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
  service: CoreService,
): Function {
  return (options): void => {
    injectQueryScopeWithTenantProperty(
      options,
      target,
      tenancyOptions,
      service,
    );
  };
}

export function beforeUpsert(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
  service: CoreService,
): Function {
  return (values, options): void => {
    if (values && values[tenancyOptions.tenantField]) {
      throw new DecoratorError(
        'Chaning tenant ID on a TenantEntity is forbiden',
      );
    }

    injectQueryScopeWithTenantProperty(
      options,
      target,
      tenancyOptions,
      service,
    );
  };
}

export function beforeFind(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
  service: CoreService,
): Function {
  return (options): void => {
    injectQueryScopeWithTenantProperty(
      options,
      target,
      tenancyOptions,
      service,
    );
  };
}

export const hooks = [
  beforeCreate,
  beforeBulkCreate,
  beforeUpdate,
  beforeBulkUpdate,
  beforeUpsert,
  beforeFind,
  beforeDestroy,
  beforeBulkDestroy,
];

export function enhanceTenantEntity(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
  service: CoreService,
) {
  for (const hook of hooks) {
    target[hook.name] = hook(target, tenancyOptions, service);
  }
}
