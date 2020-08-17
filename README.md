<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  **[WIP]** An module to enable multitenancy support with deep integration into the system as whole.
</p>

<p align="center">
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/v/nestjs-mtenant.svg" alt="NPM Version" /></a>
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/l/nestjs-mtenant.svg" alt="Package License" /></a>
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/dm/nestjs-mtenant.svg" alt="NPM Downloads" /></a>
</p>

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

And finaly include the module and the service *(assume using [Nestjs Configuration](https://docs.nestjs.com/techniques/configuration))*:
```typescript
// src/app.module.ts
import {
  MTModule, MTModuleOptions, TenantTransport,
  MT_HEADER_NAME, DEFAULT_TENANT,
} from 'nestjs-mtenant';

@Module({
  imports: [
    MTModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return <MTModuleOptions>{ ...{ // default options...
          transport?: TenantTransport.HEADER,
          headerName?: MT_HEADER_NAME,
          defaultTenant?: DEFAULT_TENANT,
        }, ...configService.get<MTModuleOptions>('multitenant')};
      },
    }),
  ],
},
```

### Usage

Let's suppose you have a `BooksService`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { MTService } from 'nestjs-mtenant';
import Book from './models/book.model';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book) private bookModel: typeof Book,
    private tenancyService: MTService, 
  ) {
    // this line is extremely important and the only one required
    tenancyService.withTenancy(bookModel);
  }

  public async create(...args): Promise<Book> {
    return this.bookModel.create(...args);
  }

  public async findById(id: number): Promise<Book> {
    return this.bookModel.findByPk<Book>(id);
  }
  
  public async findAll(...args): Promise<Array<Book>> {
    return this.bookModel.findAll(...args);
  }
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
- [ ] Cover most of codebase w/ tests
- [ ] Add comprehensive Documentation

### Contributing

* [Alex Cucer](https://github.com/AlexanderC)

### License

MIT