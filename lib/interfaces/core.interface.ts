import { Request as ExpressRequest } from 'express';
import { FastifyRequest } from 'fastify';

export enum TenantTransport {
  HEADER = 'header',
}

export type TenantContext = ExpressRequest | FastifyRequest;

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
  isTenant(): boolean;
  getTenant(): string;
  getTenantId(): string;
  getTenancyOptions(): TenancyEntityOptions;
}

export function isTenantEntity(x: unknown): x is TenantEntity {
  return (
    typeof (x as TenantEntity).isTenant === 'function' &&
    typeof (x as TenantEntity).getTenant === 'function' &&
    typeof (x as TenantEntity).getTenantId === 'function' &&
    typeof (x as TenantEntity).getTenancyOptions === 'function'
  );
}
