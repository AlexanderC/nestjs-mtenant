import { TenantTransport, TenantGuard, TenantEntity } from './core.interface';

export interface Options {
  for: Array<TenantEntity | Function>; // Entities to handle
  transport?: TenantTransport; // Tenant transport: header
  headerName?: string; // Header name to extract tenant from (if transport=header specified)
  defaultTenant?: string; // Tenant to assign by default
  allowTenant?: TenantGuard; // Allow certain requested tenant
  allowMissingTenant?: boolean; // Get both IS NULL and tenant scopes on querying
}
