---
layout: default
title: Advanced Usage
---

# Advanced Usage

## MTService

`MTService` (exported as `MtenantService`) is a global NestJS provider. Inject it wherever you need programmatic control over the tenancy scope.

```typescript
import { Injectable } from '@nestjs/common';
import { MTService } from 'nestjs-mtenant';

@Injectable()
export class UsersService {
  constructor(private readonly mt: MTService) {}
}
```

### Reading the current scope

```typescript
// Current tenancy scope for the request
const scope = this.mt.tenancyScope;
// { tenant: 'acme', enabled: true }

// The default (fallback) scope
const defaultScope = this.mt.defaultTenancyScope;
// { tenant: 'root', enabled: true }

// Configured module options
const options = this.mt.tenancyOptions;
```

---

## Setting a custom tenant

Use `MTService.setTenant()` when the tenant identifier arrives through a DTO body, a JWT claim, or any channel other than the configured header/query. The method validates the tenant against storage (if configured) and the `allowTenant` guard before updating the scope.

```typescript
// In a controller or service — sets tenant for all subsequent ORM operations
// within the same request scope
async useCustomTenant(tenant: string) {
  await this.mt.setTenant(tenant);
}
```

`setTenant()` throws `NotAcceptableException` (HTTP 406) if the tenant is not allowed.

Alternatively, you can set the tenant at the controller level from a DTO field:

```typescript
@Post()
async create(@Body() dto: CreateBookDto) {
  await this.mt.setTenant(dto.tenantOverride);
  return this.booksService.create(dto);
}
```

---

## Disabling tenancy for the current scope

Call `disableTenancyForCurrentScope()` to turn off tenant injection for every ORM operation that follows within the same request context. This is useful for admin endpoints that need to read or write across all tenants.

```typescript
async adminExport() {
  this.mt.disableTenancyForCurrentScope();
  // All subsequent queries in this request scope are un-scoped
  return this.booksService.findAll();
}
```

The method returns `MTService` so it can be chained:

```typescript
this.mt.disableTenancyForCurrentScope();
```

---

## Per-operation disable (Sequelize)

For a single Sequelize operation, pass `{ disableTenancy: true }` in the options object. This bypasses hooks for that call only without affecting the rest of the request.

```typescript
// Single query
const allBooks = await Book.findAll({ disableTenancy: true });

// Bulk create
await Book.bulkCreate(records, { disableTenancy: true });

// Nested include only
const users = await User.findAll({
  include: [{ model: Book, disableTenancy: true }],
});
```

---

## Per-operation disable (TypeORM)

TypeORM does not support an option object for subscriber bypass. Use `rawRepository` on `TenantBaseRepository` to get unfiltered access:

```typescript
const allBooks = await repo.rawRepository.find();
```

Or disable the entire scope:

```typescript
this.mt.disableTenancyForCurrentScope();
const allBooks = await repo.find();
```

---

## Global model toggle

Disable tenancy on a Sequelize model for the entire process lifetime. Useful in seed scripts and migrations that run outside a request context.

```typescript
import { Book } from './models/book.model';

Book.switchTenancy(false);
// Book queries are now unfiltered globally

// Restore when done
Book.switchTenancy(true);
```

---

## TenantEntity interface

Every class decorated with `@MTEntity()` gains the following members:

```typescript
// Static (on the class)
Model.switchTenancy(state: boolean): void;

// Instance (on the prototype)
instance.getTenant(): string;    // e.g. "acme"
instance.getTenantId(): string;  // e.g. "acme/42"
```

`getTenantId()` combines `getTenant()` and the `idField` value with a `/` separator.

---

## Integration with nestjs-iacry

`nestjs-mtenant` works well alongside [`nestjs-iacry`](https://github.com/AlexanderC/nestjs-iacry), an IAM/policy engine for NestJS. A common pattern is to build a composite principal string from both the tenant and the user's role:

```typescript
import { IACryEntity } from 'nestjs-iacry';
import { MTEntity, DEFAULT_TENANT } from 'nestjs-mtenant';
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@MTEntity()
@IACryEntity({ nameField: 'principal' })
@Table({})
export class User extends Model<User> {
  @Column id: string;
  @Column tenant: string;
  @Column role: string;

  // Principal format: "<tenant>/<role>" — e.g. "acme/admin"
  @Column(DataType.VIRTUAL)
  get principal() {
    return `${this.getDataValue('tenant') || DEFAULT_TENANT}/${this.getDataValue('role')}`;
  }
}
```

Sample policy that allows all actions for any tenant's admin except tenancy management operations:

```typescript
import { Effect } from 'nestjs-iacry';
import { DEFAULT_TENANT } from 'nestjs-mtenant';

const policies = [
  {
    Effect: Effect.ALLOW,
    Action: '!tenancy',  // everything except tenancy actions
    Principal: '*/admin',
  },
  {
    Effect: Effect.ALLOW,
    Action: '*',
    Principal: `${DEFAULT_TENANT}/admin`,  // root admin can do everything
  },
];
```
