import { TenantTransport } from './core.interface';

export interface Options {
  transport?: TenantTransport;
  headerName?: string;
  defaultTenant?: string;
}
