import * as Sequelize from 'sequelize';
import { Model, addHook } from 'sequelize-typescript';
import { TenancyEntityOptions } from '../interfaces/core.interface';
import { isTenantEntity, getTenancyService } from './entity';
import { MtenantService } from '../mtenant.service';
import { DISABLE_TENANCY_OPTION, HOOK_METHOD_PREFIX } from './constants';
import { DecoratorError } from '../errors/decorator.error';

function tenancyService(target: typeof Model): MtenantService {
  const service = getTenancyService(<any>target);

  if (!service) {
    throw new DecoratorError(
      `MTService hasn't been injected into model scope of "${target.name}"`,
    );
  }

  return service;
}

function tenancyDisabledViaOptions(options: any, removeKey: boolean = true) {
  if ((options || {})[DISABLE_TENANCY_OPTION]) {
    if (removeKey) {
      delete options[DISABLE_TENANCY_OPTION];
    }
    return true;
  }

  return false;
}

export function injectInstanceWithTenantProperty(
  attributes: any,
  options: any,
  target: typeof Model,
  tenancyOptions: TenancyEntityOptions,
): void {
  if (!isTenantEntity(target) || tenancyDisabledViaOptions(options)) {
    return;
  }

  const service = tenancyService(target);

  // do nothing if tenancy disabled
  if (!service.tenancyScope.enabled) {
    return;
  }

  // apply only if tenancy field value is missing or empty
  if (!attributes[tenancyOptions.tenantField]) {
    attributes[tenancyOptions.tenantField] = service.tenancyScope.tenant;
  }
}

export function injectQueryScopeWithTenantProperty(
  options: any,
  target: typeof Model,
  tenancyOptions: TenancyEntityOptions,
): void {
  if (!isTenantEntity(target) || tenancyDisabledViaOptions(options)) {
    return;
  }

  const service = tenancyService(target);

  // do nothing if tenancy disabled
  if (!service.tenancyScope.enabled) {
    return;
  }

  options = options || {};
  options.where = options.where || {};
  const tenantWhereClause = service.tenancyOptions.allowMissingTenant
    ? { [Sequelize.Op.in]: [service.tenancyScope.tenant, null] }
    : service.tenancyScope.tenant;

  // apply only tenancy filter option value is missing or empty
  if (!options.where[tenancyOptions.tenantField]) {
    options.where[tenancyOptions.tenantField] = tenantWhereClause;
  }

  for (const nestedOptions of options.include || []) {
    injectQueryScopeWithTenantProperty(
      nestedOptions,
      nestedOptions.model,
      tenancyOptions,
    );
  }
}

export function beforeCreate(
  target: typeof Model,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (attributes, options): void => {
    injectInstanceWithTenantProperty(
      attributes,
      options,
      target,
      tenancyOptions,
    );
  };
}

export function beforeBulkCreate(
  target: typeof Model,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (items, options): void => {
    for (const attributes of items) {
      injectInstanceWithTenantProperty(
        attributes,
        options,
        target,
        tenancyOptions,
      );
    }
  };
}

export function beforeUpdate(
  target: typeof Model,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (attributes, options): void => {
    injectInstanceWithTenantProperty(
      attributes,
      options,
      target,
      tenancyOptions,
    );
  };
}

export function beforeBulkUpdate(
  target: typeof Model,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (options): void => {
    injectQueryScopeWithTenantProperty(options, target, tenancyOptions);
  };
}

export function beforeDestroy(
  target: typeof Model,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (attributes, options): void => {
    injectInstanceWithTenantProperty(
      attributes,
      options,
      target,
      tenancyOptions,
    );
  };
}

export function beforeBulkDestroy(
  target: typeof Model,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (options): void => {
    injectQueryScopeWithTenantProperty(options, target, tenancyOptions);
  };
}

export function beforeUpsert(
  target: typeof Model,
  tenancyOptions: TenancyEntityOptions,
): Function {
  return (attributes, options): void => {
    injectInstanceWithTenantProperty(
      attributes,
      options,
      target,
      tenancyOptions,
    );
    injectQueryScopeWithTenantProperty(options, target, tenancyOptions);
  };
}

export function beforeFindAfterExpandIncludeAll(
  target: typeof Model,
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
  beforeDestroy,
  beforeBulkDestroy,
  beforeFindAfterExpandIncludeAll,
];

export function enhanceTenantEntity(
  target: typeof Model,
  tenancyOptions: TenancyEntityOptions,
) {
  for (const hook of hooks) {
    const hookMethod = `${HOOK_METHOD_PREFIX}$${hook.name}`;
    target[hookMethod] = hook(target, tenancyOptions);
    addHook(target, <any>hook.name, hookMethod);
  }
}
