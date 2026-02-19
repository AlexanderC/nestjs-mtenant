---
layout: default
title: Migration Guide
---

# Migration Guide: v0.x to v1.0

This page covers every breaking change introduced in v1.0 and the steps needed to upgrade from the 0.x series.

---

## Summary of breaking changes

| Area | v0.x | v1.0 |
|------|------|------|
| Async context | `@nestjs-steroids/async-context` | `nestjs-cls` ^6 |
| NestJS | 9 / 10 | 11 |
| Node.js | >= 14 | >= 20 |
| Module import | `AsyncContextModule` required | Not required |
| Route wildcard | `(.*)` | `{*path}` |
| TypeORM support | None | Full |
| `isTenantEntity()` | Checked `typeof Model` | Checks metadata only |

---

## 1. Dependencies

### Before (v0.x)

```bash
npm install nestjs-mtenant sequelize-typescript @nestjs-steroids/async-context
```

### After (v1.0)

```bash
npm install nestjs-mtenant nestjs-cls
# ORM-specific (install only what you use):
npm install sequelize sequelize-typescript
npm install typeorm
```

Remove `@nestjs-steroids/async-context` from your `package.json`.

---

## 2. Module imports

`AsyncContextModule` was previously required in `AppModule`. It is no longer needed — `MTModule` bundles `ClsModule` internally.

### Before (v0.x)

```typescript
import { Module } from '@nestjs/common';
import { AsyncContextModule } from '@nestjs-steroids/async-context';
import { MTModule } from 'nestjs-mtenant';

@Module({
  imports: [
    AsyncContextModule.forRoot(),
    MTModule.forRoot({ for: [User] }),
  ],
})
export class AppModule {}
```

### After (v1.0)

```typescript
import { Module } from '@nestjs/common';
import { MTModule } from 'nestjs-mtenant';

@Module({
  imports: [
    MTModule.forRoot({ for: [User] }),
  ],
})
export class AppModule {}
```

---

## 3. Route wildcard

The internal `TenancyMiddleware` mounts on all routes. In v0.x the path was `(.*)` (Express regex syntax). In v1.0 it uses the NestJS 11 wildcard syntax `{*path}`.

This change is internal and requires no action unless you have copied or overridden the middleware configuration. If you use a custom `TenancyMiddleware` registration:

### Before (v0.x)

```typescript
consumer.apply(TenancyMiddleware).forRoutes({
  path: '(.*)',
  method: RequestMethod.ALL,
});
```

### After (v1.0)

```typescript
consumer.apply(TenancyMiddleware).forRoutes({
  path: '{*path}',
  method: RequestMethod.ALL,
});
```

---

## 4. isTenantEntity() behaviour

In v0.x, `isTenantEntity()` included a `typeof Model` check which tied it to Sequelize. In v1.0 this check has been removed. The function now relies solely on the `TENANT_ENTITY_METADATA_FIELD` reflection metadata set by `@MTEntity()`.

This means `isTenantEntity()` works identically for both Sequelize and TypeORM entities, and no longer assumes a Sequelize `Model` base class.

If you call `isTenantEntity()` directly in your application code the signature is unchanged; the behaviour difference is only relevant to TypeORM entities and plain classes that were previously missed.

---

## 5. TypeORM support (new in v1.0)

TypeORM integration is new in v1.0. See [TypeORM Integration](typeorm) and [Getting Started — TypeORM Quick Start](getting-started#typeorm-quick-start) for setup instructions.

---

## 6. NestJS and Node.js version requirements

Update your `engines` field and CI configuration:

```json
{
  "engines": {
    "node": ">=20"
  }
}
```

NestJS 9 and 10 are no longer supported. Upgrade to NestJS 11 following the [official NestJS migration guide](https://docs.nestjs.com/migration-guide) before upgrading `nestjs-mtenant`.

---

## 7. Peer dependency changes

```json
// v0.x peerDependencies (approximate)
{
  "@nestjs/common": "^9 || ^10",
  "@nestjs-steroids/async-context": "^3",
  "sequelize-typescript": "^2"
}

// v1.0 peerDependencies
{
  "@nestjs/common": "^11.0.0",
  "@nestjs/core": "^11.0.0",
  "nestjs-cls": "^6.0.0",
  "reflect-metadata": ">=0.1.13"
}
```

`sequelize`, `sequelize-typescript`, `typeorm`, `ioredis`, and `@nestjs/swagger` are all optional peer dependencies in v1.0.
