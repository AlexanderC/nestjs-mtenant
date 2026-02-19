import { TenantTransport } from './interfaces/core.interface';
import { Options } from './interfaces/module.options';

export const SEQUELIZE_STORAGE = 'sequelize';
export const TYPEORM_STORAGE = 'typeorm';
export const IOREDIS_CACHE = 'ioredis';
export const MT_SCOPE_KEY = '$$MT_SCOPE$$';
export const MT_OPTIONS = 'MT_OPTIONS';
export const MT_HEADER_NAME = 'X-Tenant-ID';
export const MT_QUERY_PARAMETER_NAME = 'tenant';
export const DEFAULT_TRANSPORT = TenantTransport.HTTP;
export const DEFAULT_TENANT = 'root';
export const DEFAULT_SETTINGS_DTO = {} as any;
export const DEFAULT_OPTIONS = <Partial<Options>>{
  storageSettingsDto: DEFAULT_SETTINGS_DTO,
  transport: DEFAULT_TRANSPORT,
  headerName: MT_HEADER_NAME,
  queryParameterName: MT_QUERY_PARAMETER_NAME,
  defaultTenant: DEFAULT_TENANT,
  allowTenant: () => true,
  allowMissingTenant: true,
};
