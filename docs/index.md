---
layout: default
title: nestjs-mtenant
---

# nestjs-mtenant

[![npm version](https://img.shields.io/npm/v/nestjs-mtenant.svg)](https://npmjs.com/package/nestjs-mtenant)
[![License: MIT](https://img.shields.io/npm/l/nestjs-mtenant.svg)](https://github.com/AlexanderC/nestjs-mtenant/blob/master/LICENSE)

NestJS module for multi-tenancy with deep integration into Sequelize and TypeORM. Tenant context is propagated automatically through every request scope using [nestjs-cls](https://github.com/Papooch/nestjs-cls), so your models and entities are scoped to the correct tenant without any per-query boilerplate.

## Key Features

- Automatic tenant injection into Sequelize hooks and TypeORM subscriber
- Tenant extraction from HTTP header (`X-Tenant-ID`) or query parameter (`tenant`)
- Sequelize: 8 lifecycle hooks cover all create, update, destroy, find, upsert, and bulk operations
- TypeORM: subscriber-based write injection plus `TenantBaseRepository` for filtered reads
- Pluggable tenant storage (Sequelize, TypeORM, or custom) with optional IoRedis caching
- `@MTApi()` decorator for automatic Swagger `@ApiHeader` / `@ApiQuery` documentation
- Per-operation tenancy disable via `{ disableTenancy: true }` or `disableTenancyForCurrentScope()`
- Global model toggle via `Model.switchTenancy(false)`

## Compatibility

| nestjs-mtenant | NestJS | Node.js  | Sequelize | TypeORM |
|----------------|--------|----------|-----------|---------|
| 1.x            | 11.x   | >= 20    | 6.x       | 0.3.x   |

## Documentation

- [Getting Started](getting-started) - Installation and quick setup for Sequelize and TypeORM
- [Configuration](configuration) - Full `MTModuleOptions` reference and async setup
- [Sequelize Integration](sequelize) - Hooks, scoping, per-operation disable, nested includes
- [TypeORM Integration](typeorm) - Subscriber, `TenantBaseRepository`, limitations
- [Storage & Caching](storage) - Sequelize/TypeORM storage, IoRedis cache, custom implementations
- [Swagger Decorator](api-decorator) - `@MTApi()` usage and options
- [Advanced Usage](advanced-usage) - `MTService`, custom tenant, scope disable, `nestjs-iacry`
- [Migration Guide](migration-guide) - Upgrading from v0.x to v1.0

## Quick Example

```typescript
// 1. Decorate your model/entity
@MTEntity()
@Table({})
export class User extends Model<User> {
  id: string;
  tenant: string;
  username: string;
}

// 2. Register the module
@Module({
  imports: [
    MTModule.forRoot({ for: [User] }),
  ],
})
export class AppModule {}

// 3. All queries are automatically scoped — no changes needed in services
const users = await User.findAll(); // WHERE tenant = 'acme' (from X-Tenant-ID header)
```

## Repository

Source code and issue tracker: [github.com/AlexanderC/nestjs-mtenant](https://github.com/AlexanderC/nestjs-mtenant)
