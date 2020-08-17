import { TenancyEntityOptions } from '../interfaces/core.interface';
import { isTenantEntity, getTenantService } from './entity';
import { DecoratorError } from '../errors/decorator.error';
import { CoreService } from '../core.service';

function tenancyService(target: Function): CoreService {
  const service = <CoreService>getTenantService(target);

  if (!service) {
    throw new DecoratorError(
      'You must call MTService.withTenancy(entity) before performing any action on renant entities',
    );
  }

  return service;
}

function injectInstanceWithTenantProperty(
  instance: any,
  target: Function,
  tenancyOptions: TenancyEntityOptions,
): void {
  if (!isTenantEntity(target)) {
    return;
  }

  // apply only if tenancy field value is missing or empty
  if (!instance[tenancyOptions.tenantField]) {
    const service = tenancyService(target);
    instance[tenancyOptions.tenantField] = service.getTenancyScope().tenant;
  }
}

function injectQueryScopeWithTenantProperty(
  options: any,
  target: Function,
  tenancyOptions: TenancyEntityOptions,
): void {
  if (!isTenantEntity(target)) {
    return;
  }

  // apply only tenancy filter option value is missing or empty
  if (!((options || {}).where || {})[tenancyOptions.tenantField]) {
    const service = tenancyService(target);
    options = options || {};
    options.where = options.where || {};
    options.where[
      tenancyOptions.tenantField
    ] = service.getTenancyScope().tenant;
  }
}

export function beforeCreate(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (instance): void => {
    injectInstanceWithTenantProperty(instance, target, tenancyOptions);
  };
}

export function beforeBulkCreate(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (instances): void => {
    for (const instance of instances) {
      injectInstanceWithTenantProperty(instance, target, tenancyOptions);
    }
  };
}

export function beforeUpdate(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (instance): void => {
    injectInstanceWithTenantProperty(instance, target, tenancyOptions);
  };
}

export function beforeBulkUpdate(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (options): void => {
    injectQueryScopeWithTenantProperty(options, target, tenancyOptions);
  };
}

export function beforeDestroy(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (instance): void => {
    injectInstanceWithTenantProperty(instance, target, tenancyOptions);
  };
}

export function beforeBulkDestroy(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (options): void => {
    injectQueryScopeWithTenantProperty(options, target, tenancyOptions);
  };
}

export function beforeUpsert(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (values, options): void => {
    if (values && values[tenancyOptions.tenantField]) {
      throw new DecoratorError(
        'Chaning tenant ID on a TenantEntity is forbiden',
      );
    }

    injectQueryScopeWithTenantProperty(options, target, tenancyOptions);
  };
}

export function beforeFind(
  target: Function,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (options): void => {
    injectQueryScopeWithTenantProperty(options, target, tenancyOptions);
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
) {
  for (const hook of hooks) {
    target[hook.name] = hook(target, tenancyOptions);
  }
}
