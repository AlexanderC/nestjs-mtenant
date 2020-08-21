import { URL, URLSearchParams } from 'url';
import { TenantContext } from '../interfaces/core.interface';
import { Transport } from './transport.interface';

export class HttpTransport implements Transport {
  constructor(
    protected readonly headerName: string,
    protected readonly queryParameterName: string,
  ) {}

  extract(context: TenantContext): string {
    const normalizeHeaderName = this.normalizeHeaderName(this.headerName);

    for (const header of Object.keys(context.headers || {})) {
      if (this.normalizeHeaderName(header) === normalizeHeaderName) {
        return context.headers[header];
      }
    }

    if (!context.query && context.url) {
      context.query = {
        [this.queryParameterName]: this.urlParameter(
          context.url,
          this.queryParameterName,
        ),
      };
    }

    for (const param of Object.keys(context.query || {})) {
      if (param === this.queryParameterName) {
        return context.query[param];
      }
    }

    return null;
  }

  protected urlParameter(url: string, name: string): string {
    return new URL(url, 'https://example.org/').searchParams.get(name);
  }

  protected normalizeHeaderName(header: string): string {
    return header.toLowerCase();
  }
}
