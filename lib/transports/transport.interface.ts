import { TenantContext } from '../interfaces/core.interface';

export interface Transport {
  extract(context: TenantContext): string;
}
