<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  A module to enable multitenancy support with deep integration into the system as whole.
</p>

<p align="center">
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/v/nestjs-mtenant.svg" alt="NPM Version" /></a>
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/l/nestjs-mtenant.svg" alt="Package License" /></a>
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/dm/nestjs-mtenant.svg" alt="NPM Downloads" /></a>
</p>

### Rationale

*Warning: This module is based on `async_hooks`, which is still an experimental feature. Use it on your own risk!*

Multitenancy is widely used acros the web as software deployment options called **whitelabels**. Data in between tenants are separated,
however nowadays there is business by sharing data inbetween the peer businesses; as an example might serve a E-commerce platform that shares
their clients with twin/friendly shop, or there's some unified backoffice interface... Thus a good idea would be
**having the data under the same database (think namespace)** instead of having to separate into different databases,
in order to be able to query it efficiently and avoid duplication or synchronization issues.

### Installation

```sh
npm install --save nestjs-mtenant sequelize-typescript
#or
yarn add nestjs-mtenant sequelize-typescript
```

> Important: `sequelize-typescript` is required if you are using `sequelize` policy storage model.

### Configuration

Configure your models:
```typescript
// models/user.model.ts
import { MTEntity } from 'nestjs-mtenant';

// @MTEntity({ tenantField?: 'tenant', idField?: 'id' })
@MTEntity() 
@Table({})
export default class User extends Model<User> {
  id: string; // idField
  tenant: string; // tenantField
  username: string;
}

// models/book.model.ts
import { MTEntity } from 'nestjs-mtenant';

// @MTEntity({ tenantField?: 'tenant', idField?: 'id' })
@MTEntity() 
@Table({})
export default class Book extends Model<Book> {
  id: string; // idField
  tenant: string; // tenantField
  title: string;
  content: string;
}
```

> Tenant Entity is enhanced with the following properties:
> ```typescript
> export interface TenantEntity {
>   getTenant(): string; // e.g. "root"
>   getTenantId(): string; // e.g. "root/33"
> }
> ```

*(OPTIONAL)* Configure tenant storage using sequelize adapter:
```typescript
// models/tenants-storage.model.ts
import { TenantsStorageSequelizeModel } from 'nestjs-mtenant';

export default class TenantsStorage extends TenantsStorageSequelizeModel<TenantsStorage> {  }
```

And finaly include the module and the service *(assume using [Nestjs Configuration](https://docs.nestjs.com/techniques/configuration))*:
```typescript
// src/app.module.ts
import { MTModule, MTModuleOptions, SEQUELIZE_STORAGE, IOREDIS_CACHE } from 'nestjs-mtenant';
import { TenantSettingsDto } from './tenancy/tenant-settings.dto';
import TenantsStorage from '../models/tenants-storage.model';
import User from '../models/user.model';
import Book from '../models/book.model';

@Module({
  imports: [
    MTModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService, RedisService],
      useFactory: async (configService: ConfigService, redisService: RedisService) => {
        return {
          for: [User, Book],
          // The below options are optional
          storage: SEQUELIZE_STORAGE,
          storageSettingsDto: TenantSettingsDto,
          storageRepository: TenantsStorage,
          cache: IOREDIS_CACHE,
          cacheClient: <IORedis.Redis>await redisService.getClient(), 
          cacheOptions: { expire: 600 }, // tenant cache expires in 10 minutes (default 1 hour)
        };
      },
    }),
  ],
},
```

> Configuration reference:
> 
> ```typescript
> export interface MTModuleOptions {
>  for: Array<TenantEntity | Function>, // Entities to handle, e.g. [BookModel, UserModel]
>  transport?: TenantTransport; // Tenant transport: http
>  headerName?: string; // Header name to extract tenant from (if transport=http specified)
>  queryParameterName?: string; // Query parameter name to extract tenant from (if transport=http specified)
>  defaultTenant?: string; // Tenant to assign by default
>  allowTenant?: (context: TenantContext, tenant: string) => boolean; // Allow certain requested tenant, augmented by tenant storage if setup
>  allowMissingTenant?: boolean; // Get both IS NULL and tenant scopes on querying
>  storage?: string | Storage; // dynamic tenant storage (e.g. sequelize)
>  storageSettingsDto?: any, // Tenant settings interface
>  storageRepository?: any; // if database storage specified
>  cache?: string | Cache; // if storage specified! dynamic tenant storage cache (e.g. ioredis)
>  cacheClient?: any; // if cache adapter specified
>  cacheOptions?: CachedStorageOptions; // if cache adapter specified
> }
> ```

> Important: if `storage` is setup- `allowTenant` is augmented by storage manager.
> Which would mean that the manager checks if tenant exists in the storage itself and pass it to next to `allowTenant` guard
> (otherwise returning false, `allowTenant` not being called at all; *@ref `MTService.isTenantAllowed()`*).

### Usage

There's literally nothing to configure, except a decorator 
to enrich Swagger docs by adding description of tenancy transport (e.g. through an `@ApiHeader()` and an `@ApiQuery()`)
in your controllers that support multi-tenancy:

```typescript
import { MTApi } from 'nestjs-mtenant';

@MTApi()
@Controller()
export class BooksController {
  // If "includeQuery=true" parameter specified, it will allow
  // setting tenant via MT_QUERY_PARAMETER_NAME query param.
  @MTApi({ includeQuery: true })
  someAction() {  }
}
```

> Tenancy scope taken from the transport specified will be injected into instances and queries.
> If `allowMissingTenant=true` specified- queries will select entries for both- the tenant and missing tenant.

Switch model tenancy globally:

```typescript
BookModel.switchTenancy(/* enabled =*/ false)
```

Switch model tenancy for a single operation (*e.g. super-admin related ops*):

```typescript
// supports any operation supporting option parameter, incl. bulk ones
BookModel.create({...}, { disableTenancy: true });
// for complex operations with includes
UserModel.findAll({
  disableTenancy: true,
  include: [ { model: BookModel } ],
});
// ... or disable only for BookModel
UserModel.findAll({
  include: [ { model: BookModel, disableTenancy: true } ],
});
```

Setting custom tenant or disabling tenancy for the current request scope:

```typescript
import { MTService } from 'nestjs-mtenant';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    private readonly tenancyService: MTService,
  ) { }

  // Will enforce using it for subsequent model operations within the scope
  // e.g. (await BooksService.useCustomTenant('custom-one')).create(...)
  // This might be set in controllers as well, when taking from a DTO when
  // there's no option to use a header.
  // Optionally you might set MT_QUERY_PARAMETER_NAME query paremeter to achieve the same...
  async useCustomTenant(tenant: string) {
    await this.tenancyService.setTenant(tenant);
    return this;
  }

  // Disabling tenancy for the current request scope (e.g. controller)
  // You might need to disable tenancy without changing subsequent services logic
  async disableTenancy() {
    this.tenancyService.disableTenancyForCurrentScope();
    return this;
  }
}
```

Typical stored tenants manager service (*if `storage` option configured*):

```typescript
// src/tenancy/tenant-settings.dto.ts
export class TenantSettingsDto {
  someSetting?: string,
  otherOne?: any,
}

// src/tenancy/tenancy.service.ts
import { Injectable } from '@nestjs/common';
import { MTService, StoredTenantEntity } from 'nestjs-mtenant';
import { TenantSettingsDto } from './tenant-settings.dto';

@Injectable()
export class TenancyService {
  constructor(
    private readonly tenancyService: MTService,
  ) { }

  async setting(name: keyof TenantSettingsDto, defaultValue: any): Promise<any> {
    const { tenant } = this.tenancyService.tenancyScope;

    if (tenant === this.tenancyService.defaultTenancyScope.tenant) {
      return defaultValue;
    }

    const tenantEntity = await this.get(tenant);

    if (!tenantEntity) {
      return defaultValue;
    }

    return (tenantEntity as StoredTenantEntity<TenantSettingsDto>).settings[name] || defaultValue;
  }

  async add(tenant: string, settings: TenantSettingsDto):
    Promise<StoredTenantEntity<TenantSettingsDto>> {
    return this.tenancyService.storage.add(tenant, settings);
  }

  async remove(tenant: string): Promise<number> {
    return this.tenancyService.storage.remove(tenant);
  }

  async exists(tenant: string): Promise<Boolean> {
    return this.tenancyService.storage.exists(tenant);
  }

  async updateSettings(tenant: string, settings: TenantSettingsDto):
    Promise<StoredTenantEntity<TenantSettingsDto>> {
    return this.tenancyService.storage.updateSettings(tenant, settings);
  }

  async get(tenant?: string):
    Promise<StoredTenantEntity<TenantSettingsDto> | Array<StoredTenantEntity<TenantSettingsDto>>> {
    return this.tenancyService.storage.get(tenant);
  }
}
```

> Storage interface reference (*where `T === typeof TenantSettingsDto`*):
> 
> ```typescript
> export interface TenantEntity<T> {
>   tenant: string,
>   settings: T,
> }
>
> export interface Storage<T> {
>   add(tenant: string, settings?: T): Promise<TenantEntity<T>>;
>   remove(tenant: string): Promise<number>;
>   exists(tenant: string): Promise<Boolean>;
>   updateSettings(tenant: string, settings: T): Promise<TenantEntity<T>>;
>   get(tenant: string): Promise<TenantEntity<T>>;
> }
> ```


`nestjs-mtenant` integrates pretty well with the [`nestjs-iacry`](https://github.com/AlexanderC/nestjs-iacry#readme) module:

```typescript
// models/user.model.ts
import { IACryEntity } from 'nestjs-iacry';
import { MTEntity, DEFAULT_TENANT } from 'nestjs-mtenant';

@MTEntity() 
@IACryEntity({ nameField: 'principal' })
@Table({})
export default class User extends Model<User> {
  id: string; // idField
  tenant: string; // tenantField
  role?: string;

  // Get principals like "root/admin:33"
  @Column(DataType.VIRTUAL)
  get principal() {
    return `${this.getDataValue('tenant') || DEFAULT_TENANT}/${this.getDataValue('role')}`;
  }
}
```

A typical example of `nestjs-iacry` policies would look like:

```typescript
// Allow everything for admins from any tenant
[
  {
    Effect: Effect.ALLOW,
    Action: '!tenancy', // allow anything but tenancy related stuff
    Principal: `*/${UserRoles.Admin}`,
  },
  {
    Effect: Effect.ALLOW,
    Action: '*',
    Principal: `${DEFAULT_TENANT}/${UserRoles.Admin}`,
  },
]
```

### Development

Running tests:
```bash
npm test
```

Releasing:
```bash
npm run format
npm run release # npm run patch|minor|major
npm run deploy
```

### TODO

- [ ] Add support for TypeORM
- [ ] Add support for strategies (e.g. different database, table suffix)
- [ ] Cover most of codebase w/ tests
- [ ] Add comprehensive Documentation

### Contributing

* [Alex Cucer](https://github.com/AlexanderC)

### License

MIT
