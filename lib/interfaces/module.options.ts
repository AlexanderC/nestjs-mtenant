import { TenantTransport, TenantGuard } from './core.interface';

export interface Options {
  transport?: TenantTransport; // Tenant transport: header
  headerName?: string; // Header name to extract tenant from (if transport=header specified)
  defaultTenant?: string; // Tenant to assign by default
  allowTenant?: TenantGuard; // Allow certain requested tenant
  allowMissingTenant?: boolean; // Get both IS NULL and tenant scopes on querying
}
