import { TenancyEntityOptions } from '../interfaces/core.interface';

export const DISABLE_TENANCY_OPTION = 'disableTenancy';
export const TENANCY_SERVICE_METADATA_FIELD = '$$MT_TENANCY_SERVICE$$';
export const TENANT_ENTITY_METADATA_FIELD = '$$MT_TENANT_ENTITY$$';
export const HOOK_METHOD_PREFIX = '$$MT$$_';
export const TENANT_FIELD = 'tenant';
export const ID_FIELD = 'id';
export const DEFAULT_ENTITY_OPTIONS = <TenancyEntityOptions>{
  tenantField: TENANT_FIELD,
  idField: ID_FIELD,
};
