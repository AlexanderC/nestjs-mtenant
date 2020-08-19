<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  **[WIP]** A module to enable multitenancy support with deep integration into the system as whole.
</p>

<p align="center">
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/v/nestjs-mtenant.svg" alt="NPM Version" /></a>
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/l/nestjs-mtenant.svg" alt="Package License" /></a>
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/dm/nestjs-mtenant.svg" alt="NPM Downloads" /></a>
</p>

### Rationale

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

And finaly include the module and the service *(assume using [Nestjs Configuration](https://docs.nestjs.com/techniques/configuration))*:
```typescript
// src/app.module.ts
import { MTModule, MTModuleOptions } from 'nestjs-mtenant';

@Module({
  imports: [
    MTModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return configService.get<MTModuleOptions>('multitenancy');
      },
    }),
  ],
},
```

> Configuration reference:
> 
> ```typescript
> export interface MTModuleOptions {
>   for: Array<TenantEntity | Function>, // Entities to handle, e.g. [BookModel, UserModel]
>   transport?: TenantTransport; // Tenant transport: header
>   headerName?: string; // Header name to extract tenant from (if transport=header specified)
>   defaultTenant?: string; // Tenant to assign by default
>   allowTenant?: (context: TenantContext, tenant: string) => boolean; // Allow certain requested tenant
>   allowMissingTenant?: boolean; // Get both IS NULL and tenant scopes on querying
> }
> ```

### Usage

There's literally nothing to configure, expect a decorator 
to enrich Swagger docs by adding description of tenancy transport (e.g. through an `@ApiHeader()`)
in your controllers that support multi-tenancy:

```typescript
import { MTApi } from 'nestjs-mtenant';

@MTApi()
@Controller()
export class BooksController { }
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

`nestjs-mtenant` integrates pretty well with the [`nestjs-iacry`](https://github.com/AlexanderC/nestjs-iacry#readme) module:

```typescript
// models/user.model.ts
import { IACryEntity } from 'nestjs-iacry';
import { MTEntity } from 'nestjs-mtenant';

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
    return `${this.getDataValue('tenant')}/${this.getDataValue('role')}`;
  }
}
```

An example of `nestjs-iacry` policy would look like:

```typescript
// Allow everything for admins from any tenant
{
  Effect: Effect.ALLOW,
  Action: '*',
  Principal: `*/${UserRoles.Admin}`,
}
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