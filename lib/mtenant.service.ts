import { Injectable, Inject, NotAcceptableException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseError } from './errors/mtenant.error';
import { Options } from './interfaces/module.options';
import { injectTenancyService } from './decorators/entity';
import {
  TenantTransport,
  TenantContext,
  TenancyScope,
  TenantEntity,
} from './interfaces/core.interface';
import { HttpTransport } from './transports/http.transport';
import { Transport } from './transports/transport.interface';
import { Cache } from './storages/cache/cache.interface';
import { IoRedis } from './storages/cache/ioredis';
import { CachedStorage } from './storages/cached.storage';
import { Storage } from './interfaces/storage.interface';
import { SequelizeStorage } from './storages/sequelize.storage';
import {
  SEQUELIZE_STORAGE,
  TYPEORM_STORAGE,
  IOREDIS_CACHE,
  MT_SCOPE_KEY,
  MT_OPTIONS,
  DEFAULT_OPTIONS,
} from './constants';

@Injectable()
export class MtenantService {
  protected transport: Transport;
  public storage: Storage<unknown>;

  constructor(
    @Inject(MT_OPTIONS) protected options: Options,
    private readonly cls: ClsService,
  ) {
    this.setup(options);
  }

  async runWithinTenancyScope(
    context: TenantContext,
    handler: Function,
  ): Promise<void> {
    this.cls.set(MT_SCOPE_KEY, {
      tenant: await this.getTenant(context),
      enabled: true,
    });
    handler();
  }

  async setTenant(
    tenant: string,
    context?: TenantContext,
  ): Promise<MtenantService> {
    if (!(await this.isTenantAllowed(context || {}, tenant))) {
      throw new NotAcceptableException(`Tenant "${tenant}" not allowed`);
    }

    this.cls.set(MT_SCOPE_KEY, {
      tenant,
      enabled: true,
    });
    return this;
  }

  async getTenant(context: TenantContext): Promise<string> {
    const tenant = await this.transport.extract(context);

    if (tenant && !(await this.isTenantAllowed(context, tenant))) {
      throw new NotAcceptableException(`Tenant "${tenant}" not allowed`);
    }

    return tenant || this.options.defaultTenant;
  }

  async isTenantAllowed(
    context: TenantContext,
    tenant: string,
  ): Promise<Boolean> {
    // allow default tenant without any checks
    if (tenant === this.options.defaultTenant) {
      return true;
    }

    // check if tenant exists in storage
    if (this.storage && !(await this.storage.exists(tenant))) {
      return false;
    }

    return this.options.allowTenant(context, tenant);
  }

  disableTenancyForCurrentScope(): MtenantService {
    this.cls.set(MT_SCOPE_KEY, {
      ...this.tenancyScope,
      enabled: false,
    });
    return this;
  }

  protected setup(options: Options): void {
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    // because "typeof this.options.storageSettingsDto" doesn't compile
    const SettingsDTO = this.options.storageSettingsDto;

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

    // initialize persistent storage
    if (this.options.storage) {
      switch (typeof this.options.storage) {
        case 'string':
          switch (this.options.storage.toLowerCase()) {
            case SEQUELIZE_STORAGE:
              this.storage = new SequelizeStorage<typeof SettingsDTO>(
                this.options.storageRepository,
              );
              break;
            case TYPEORM_STORAGE:
              try {
                const {
                  TypeOrmStorage,
                } = require('./storages/typeorm.storage');
                this.storage = new TypeOrmStorage(
                  this.options.storageRepository,
                );
              } catch (e) {
                throw new BaseError(
                  'TypeORM storage requires typeorm to be installed',
                );
              }
              break;
            default:
              throw new BaseError(
                `Unrecognized tenant storage type: ${this.options.storage}`,
              );
          }
          break;
        default:
          this.storage = this.options.storage;
      }
    }

    // setup cache
    if (this.options.cache) {
      if (!this.storage) {
        throw new BaseError(
          'Cache option must be specified only when storage is set',
        );
      }

      let cache: Cache;

      switch (typeof this.options.cache) {
        case 'string':
          switch (this.options.cache.toLowerCase()) {
            case IOREDIS_CACHE:
              cache = new IoRedis(this.options.cacheClient);
              break;
            default:
              throw new BaseError(
                `Unrecognized tenant storage cache type: ${this.options.cache}`,
              );
          }
          break;
        default:
          cache = <Cache>this.options.cache;
      }

      this.storage = new CachedStorage<typeof SettingsDTO>(
        this.storage as Storage<typeof SettingsDTO>,
        cache,
        this.options.cacheOptions,
      );
    }

    for (const entity of this.options.for) {
      injectTenancyService(entity as TenantEntity, this);
    }

    // Register TypeORM subscriber if dataSource is provided
    if (this.options.dataSource) {
      this.registerTypeOrmSubscriber(this.options.dataSource);
    }
  }

  private registerTypeOrmSubscriber(dataSource: any): void {
    try {
      const {
        TenantEntitySubscriber,
      } = require('./subscribers/tenant-entity.subscriber');
      const alreadyRegistered = dataSource.subscribers.some(
        (s: any) => s instanceof TenantEntitySubscriber,
      );
      if (!alreadyRegistered) {
        const subscriber = new TenantEntitySubscriber();
        dataSource.subscribers.push(subscriber);
      }
    } catch (e) {
      // TypeORM not installed; skip subscriber registration
    }
  }

  get tenancyScope(): TenancyScope {
    try {
      return this.cls.get(MT_SCOPE_KEY) || this.defaultTenancyScope;
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
}
