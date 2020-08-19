import { TenantContext } from '../interfaces/core.interface';
import { Transport } from './transport.interface';

export class HeaderTransport implements Transport {
  constructor(protected readonly headerName: string) {}

  extract(context: TenantContext): string {
    const normalizeHeaderName = this.normalizeHeaderName(this.headerName);

    for (const header of Object.keys(context.headers || {})) {
      if (this.normalizeHeaderName(header) === normalizeHeaderName) {
        return context.headers[header];
      }
    }

    return null;
  }

  protected normalizeHeaderName(header: string): string {
    return header.toLowerCase();
  }
}
