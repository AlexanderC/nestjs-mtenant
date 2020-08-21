import {
  Injectable,
  Inject,
  NotAcceptableException,
  Scope,
} from '@nestjs/common';
import { AsyncContext } from '@nestjs-steroids/async-context';
import { BaseError } from './errors/mtenant.error';
import { Options } from './interfaces/module.options';
import {
  TenantTransport,
  TenantContext,
  TenancyScope,
  TenantEntity,
} from './interfaces/core.interface';
import { HttpTransport } from './transports/http.transport';
import { Transport } from './transports/transport.interface';
import { MT_SCOPE_KEY, MT_OPTIONS, DEFAULT_OPTIONS } from './constants';
import { injectTenancyService } from './decorators/entity';

@Injectable()
export class CoreService {
  protected transport: Transport;

  constructor(
    @Inject(MT_OPTIONS) private options: Options,
    private readonly asyncContext: AsyncContext,
  ) {
    this.setup(options);
  }

  async runWithinTenancyScope(
    context: TenantContext,
    handler: Function,
  ): Promise<void> {
    this.asyncContext.register();
    this.asyncContext.set<typeof MT_SCOPE_KEY, TenancyScope>(MT_SCOPE_KEY, {
      tenant: await this.getTenant(context),
      enabled: true,
    });
    handler();
  }

  async setTenant(
    tenant: string,
    context?: TenantContext,
  ): Promise<CoreService> {
    if (!(await this.options.allowTenant(context || {}, tenant))) {
      throw new NotAcceptableException(`Tenant "${tenant}" not allowed`);
    }

    this.asyncContext.set<typeof MT_SCOPE_KEY, TenancyScope>(MT_SCOPE_KEY, {
      tenant,
      enabled: true,
    });
    return this;
  }

  async getTenant(context: TenantContext): Promise<string> {
    const tenant = await this.transport.extract(context);

    if (tenant && !(await this.options.allowTenant(context, tenant))) {
      throw new NotAcceptableException(`Tenant "${tenant}" not allowed`);
    }

    return tenant || this.options.defaultTenant;
  }

  disableTenancyForCurrentScope(): CoreService {
    this.asyncContext.set<typeof MT_SCOPE_KEY, TenancyScope>(MT_SCOPE_KEY, {
      ...this.tenancyScope,
      enabled: false,
    });
    return this;
  }

  get tenancyScope(): TenancyScope {
    try {
      return (
        this.asyncContext.get<typeof MT_SCOPE_KEY, TenancyScope>(
          MT_SCOPE_KEY,
        ) || this.defaultTenancyScope
      );
    } catch (e) {
      return this.defaultTenancyScope;
    }
  }

  get defaultTenancyScope(): TenancyScope {
    return {
      tenant: this.options.defaultTenant,
      enabled: true,
    };
  }

  get tenancyOptions(): Options {
    return this.options;
  }

  protected setup(options: Options): void {
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);

    switch (this.options.transport) {
      case TenantTransport.HTTP:
        this.transport = new HttpTransport(
          this.options.headerName,
          this.options.queryParameterName,
        );
        break;
      default:
        throw new BaseError(
          `Unknown tenant transport "${this.options.transport}"`,
        );
    }

    for (const entity of this.options.for) {
      injectTenancyService(entity as TenantEntity, this);
    }
  }
}
