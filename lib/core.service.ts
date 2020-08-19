import { Injectable, Inject, NotAcceptableException } from '@nestjs/common';
import { ContinuationLocalStorage } from 'asyncctx';
import { BaseError } from './errors/mtenant.error';
import { Options } from './interfaces/module.options';
import {
  TenantTransport,
  TenantContext,
  TenancyScope,
  TenantEntity,
} from './interfaces/core.interface';
import { HeaderTransport } from './transports/header.transport';
import { Transport } from './transports/transport.interface';
import { MT_OPTIONS, DEFAULT_OPTIONS } from './constants';
import { injectTenancyService } from './decorators/entity';

@Injectable()
export class CoreService {
  protected transport: Transport;
  protected readonly cls = new ContinuationLocalStorage<TenancyScope>();

  constructor(@Inject(MT_OPTIONS) private options: Options) {
    this.setup(options);
  }

  async withTenancyScope(
    context: TenantContext,
    handler: Function,
  ): Promise<any> {
    this.cls.setContext({
      tenant: await this.getTenant(context),
      enabled: true,
    });
    return handler();
  }

  async setTenant(
    tenant: string,
    context?: TenantContext,
  ): Promise<CoreService> {
    if (!(await this.options.allowTenant(context || {}, tenant))) {
      throw new NotAcceptableException(`Tenant "${tenant}" not allowed`);
    }

    this.cls.setContext({ tenant, enabled: true });
    return this;
  }

  disableTenancyForCurrentScope(): CoreService {
    this.cls.setContext({ tenant: null, enabled: true });
    return this;
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

    this.cls.setRootContext({
      tenant: this.options.defaultTenant,
      enabled: true,
    });

    for (const entity of this.options.for) {
      injectTenancyService(entity as TenantEntity, this);
    }
  }
}
