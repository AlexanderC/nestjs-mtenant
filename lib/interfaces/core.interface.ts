export enum TenantTransport {
  HEADER = 'header',
}

// ExpressRequest or FastifyRequest
export type TenantContext = { headers: { [key: string]: string } };

export interface TenancyScope {
  tenant: string;
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
  getTenant(): string; // e.g. "root"
  getTenantId(): string; // e.g. "root/33"
}

export function isTenantEntity(x: unknown): x is TenantEntity {
  return (
    typeof (x as TenantEntity).getTenant === 'function' &&
    typeof (x as TenantEntity).getTenantId === 'function'
  );
}

export type TenantGuard = (context: TenantContext, tenant: string) => boolean;
