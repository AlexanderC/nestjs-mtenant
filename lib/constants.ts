import { TenantTransport } from './interfaces/core.interface';
import { Options } from './interfaces/module.options';

export const MT_OPTIONS = 'MT_OPTIONS';
export const MT_HEADER_NAME = 'X-Tenant-ID';
export const DEFAULT_TRANSPORT = TenantTransport.HEADER;
export const DEFAULT_TENANT = 'root';
export const DEFAULT_OPTIONS = <Options>{
  transport: DEFAULT_TRANSPORT,
  headerName: MT_HEADER_NAME,
  defaultTenant: DEFAULT_TENANT,
  allowTenant: () => true,
  allowMissingTenant: true,
};
