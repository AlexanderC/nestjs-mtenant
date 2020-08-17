import { Injectable, Inject } from '@nestjs/common';
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
import { isTenantEntity, setTenantService } from './decorators/entity';

@Injectable()
export class CoreService {
  protected transport: Transport;
  protected readonly cls = new ContinuationLocalStorage<TenancyScope>();

  constructor(@Inject(MT_OPTIONS) private options: Options) {
    this.setup(options);
  }

  injectTenancyScope(context: TenantContext): void {
    this.cls.setContext({ tenant: this.getTenant(context) });
  }

  getTenancyScope(): TenancyScope {
    return this.cls.getContext();
  }

  getTenant(context: TenantContext): string {
    return this.transport.extract(context) || this.options.defaultTenant;
  }

  withTenancy(entity: Function): Function {
    if (!isTenantEntity(entity)) {
      return entity;
    }

    return setTenantService(entity, this);
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
