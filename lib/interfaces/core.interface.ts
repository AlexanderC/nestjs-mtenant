export enum TenantTransport {
  HEADER = 'header',
}

// ExpressRequest or FastifyRequest
export type TenantContext = { headers?: { [key: string]: string } };

export interface TenancyScope {
  tenant: string;
  enabled: boolean;
}

export interface TenancyEntityOptions {
  tenantField: string;
  idField: string;
}

export interface TenantEntityDto {
  tenant: string;
  tenantId: string;
}

export interface TenantEntity {
  switchTenancy(state: boolean): void; // on|off
  getTenant(): string; // e.g. "root"
  getTenantId(): string; // e.g. "root/33"
}

export function isTenantEntity(x: unknown): x is TenantEntity {
  return (
    typeof (x as TenantEntity).switchTenancy === 'function' &&
    typeof (x as TenantEntity).getTenant === 'function' &&
    typeof (x as TenantEntity).getTenantId === 'function'
  );
}

export type TenantGuard = (context: TenantContext, tenant: string) => boolean;
