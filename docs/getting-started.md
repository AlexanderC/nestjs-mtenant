---
layout: default
title: Getting Started
---

# Getting Started

## Prerequisites

- Node.js >= 20
- NestJS 11
- `nestjs-cls` ^6

## Installation

Install the core package and `nestjs-cls`:

```bash
npm install nestjs-mtenant nestjs-cls
```

Install your ORM of choice:

```bash
# For Sequelize:
npm install sequelize sequelize-typescript

# For TypeORM:
npm install typeorm
```

`@nestjs/swagger` and `ioredis` are optional peer dependencies needed only for Swagger integration and Redis caching respectively.

---

## Sequelize Quick Start

### 1. Decorate your models

Apply `@MTEntity()` to each model that should be tenant-scoped. The decorator registers Sequelize hooks and adds the `getTenant()` / `getTenantId()` helpers to the prototype.

```typescript
// models/user.model.ts
import { MTEntity } from 'nestjs-mtenant';
import { Table, Column, Model } from 'sequelize-typescript';

// Defaults: tenantField = 'tenant', idField = 'id'
// Override: @MTEntity({ tenantField: 'org', idField: 'uuid' })
@MTEntity()
@Table({})
export class User extends Model<User> {
  @Column id: string;
  @Column tenant: string;
  @Column username: string;
}
```

```typescript
// models/book.model.ts
import { MTEntity } from 'nestjs-mtenant';
import { Table, Column, Model } from 'sequelize-typescript';

@MTEntity()
@Table({})
export class Book extends Model<Book> {
  @Column id: string;
  @Column tenant: string;
  @Column title: string;
}
```

### 2. Register `MTModule`

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { MTModule } from 'nestjs-mtenant';
import { User } from '../models/user.model';
import { Book } from '../models/book.model';

@Module({
  imports: [
    MTModule.forRoot({
      for: [User, Book],
    }),
  ],
})
export class AppModule {}
```

### 3. That is all

Every Sequelize query on `User` or `Book` is now automatically scoped to the tenant value found in the `X-Tenant-ID` request header. No changes are needed in your services or repositories.

```typescript
// This query automatically becomes:
// SELECT * FROM "users" WHERE tenant = 'acme' (or tenant IS NULL when allowMissingTenant=true)
const users = await User.findAll();
```

---

## TypeORM Quick Start

### 1. Decorate your entities

```typescript
// entities/user.entity.ts
import { MTEntity } from 'nestjs-mtenant';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@MTEntity()
@Entity()
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant: string;
  @Column() username: string;
}
```

```typescript
// entities/book.entity.ts
import { MTEntity } from 'nestjs-mtenant';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@MTEntity()
@Entity()
export class Book {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant: string;
  @Column() title: string;
}
```

### 2. Register `MTModule` with a `DataSource`

Passing `dataSource` causes the module to register `TenantEntitySubscriber` automatically.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { MTModule } from 'nestjs-mtenant';
import { dataSource } from './data-source';
import { User } from './entities/user.entity';
import { Book } from './entities/book.entity';

@Module({
  imports: [
    MTModule.forRoot({
      for: [User, Book],
      dataSource,
    }),
  ],
})
export class AppModule {}
```

### 3. Use `TenantBaseRepository` for reads

TypeORM does not intercept read queries via subscribers. Wrap the standard `Repository` with `TenantBaseRepository` to get automatic tenant filtering on every find operation.

```typescript
import { TenantBaseRepository } from 'nestjs-mtenant';
import { dataSource } from './data-source';
import { User } from './entities/user.entity';

const repo = new TenantBaseRepository<User>(User, dataSource);

// Automatically adds WHERE tenant = '<current>' to the query
const users = await repo.find();
const user = await repo.findOne({ where: { id: 1 } });
```

Write operations (`save`, `remove`, `softRemove`) are handled automatically by `TenantEntitySubscriber` — the tenant field is set on the entity before it is persisted.

> See [TypeORM Integration](typeorm) for the full API and important limitations.
