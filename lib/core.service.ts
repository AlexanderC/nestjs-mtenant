import { Injectable, Inject, NotAcceptableException } from '@nestjs/common';
import { ContinuationLocalStorage } from 'asyncctx';
import { BaseError } from './errors/mtenant.error';
import { Options } from './interfaces/module.options';
import {
  TenantTransport,
  TenantContext,
  TenancyScope,
} from './interfaces/core.interface';
import { HeaderTransport } from './transports/header.transport';
import { Transport } from './transports/transport.interface';
import { MT_OPTIONS, DEFAULT_OPTIONS } from './constants';

@Injectable()
export class CoreService {
  protected transport: Transport;
  protected readonly cls = new ContinuationLocalStorage<TenancyScope>();

  constructor(@Inject(MT_OPTIONS) private options: Options) {
    this.setup(options);
  }

  async injectTenancyScope(context: TenantContext): Promise<void> {
    this.cls.setContext({ tenant: await this.getTenant(context) });
  }

  async getTenant(context: TenantContext): Promise<string> {
    const tenant = await this.transport.extract(context);

    if (tenant && !(await this.options.allowTenant(context, tenant))) {
      throw new NotAcceptableException(`Tenant "${tenant}" not allowed`);
    }

    return tenant || this.options.defaultTenant;
  }

  get tenancyScope(): TenancyScope {
    return this.cls.getContext();
  }

  get tenancyOptions(): Options {
    return this.options;
  }

  protected setup(options: Options): void {
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);

    switch (this.options.transport) {
      case TenantTransport.HEADER:
        this.transport = new HeaderTransport(this.options.headerName);
        break;
      default:
        throw new BaseError(
          `Unknown tenant transport "${this.options.transport}"`,
        );
    }

    this.cls.setRootContext({ tenant: this.options.defaultTenant });
  }
}
