---
layout: default
title: TypeORM Integration
---

# TypeORM Integration

## @MTEntity() decorator

Apply `@MTEntity()` before `@Entity()` on any TypeORM entity class that should be tenant-scoped. The decorator stores metadata that `TenantEntitySubscriber` and `TenantBaseRepository` read at runtime. It does not register TypeORM hooks directly.

```typescript
import { MTEntity } from 'nestjs-mtenant';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Default fields: tenantField='tenant', idField='id'
@MTEntity()
@Entity()
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant: string;
  @Column() username: string;
}

// Custom field names
@MTEntity({ tenantField: 'org_id', idField: 'uuid' })
@Entity()
export class Invoice {
  @PrimaryGeneratedColumn('uuid') uuid: string;
  @Column() org_id: string;
  @Column() amount: number;
}
```

---

## TenantEntitySubscriber

`TenantEntitySubscriber` handles write operations by intercepting TypeORM entity events and setting the tenant field before the database operation executes.

### Covered events

| Event | Behaviour |
|-------|-----------|
| `beforeInsert` | Sets `tenant` on the entity if not already set |
| `beforeUpdate` | Sets `tenant` on the entity if not already set |
| `beforeRemove` | Sets `tenant` on the entity if not already set |
| `beforeSoftRemove` | Sets `tenant` on the entity if not already set |

The subscriber is registered automatically when you pass `dataSource` to `MTModule.forRoot()`. You can also register it manually:

```typescript
import { TenantEntitySubscriber } from 'nestjs-mtenant';

dataSource.subscribers.push(new TenantEntitySubscriber());
```

---

## TenantBaseRepository

TypeORM's subscriber API does not intercept read queries. Use `TenantBaseRepository` as a drop-in replacement for `Repository<T>` to get automatic tenant filtering on every find operation.

### Constructor

```typescript
const repo = new TenantBaseRepository<User>(User, dataSource);
```

### Read methods (tenant-filtered automatically)

| Method | Description |
|--------|-------------|
| `find(options?)` | `repository.find()` with tenant `where` injected |
| `findOne(options)` | `repository.findOne()` with tenant `where` injected |
| `findAndCount(options?)` | `repository.findAndCount()` with tenant `where` injected |
| `findBy(where)` | `repository.findBy()` with tenant clause merged |
| `findOneBy(where)` | `repository.findOneBy()` with tenant clause merged |
| `count(options?)` | `repository.count()` with tenant `where` injected |
| `createQueryBuilder(alias?)` | Returns a `QueryBuilder` with `.andWhere(tenant = ?)` already applied |

When `allowMissingTenant: true`, the injected clause is `WHERE (tenant = :t OR tenant IS NULL)`.

### Write methods (delegate to underlying repository)

| Method | Description |
|--------|-------------|
| `save(entity)` | Delegates to `repository.save()` — subscriber sets tenant |
| `remove(entity)` | Delegates to `repository.remove()` |
| `softRemove(entity)` | Delegates to `repository.softRemove()` |

### rawRepository escape hatch

Access the underlying unfiltered `Repository<T>` for admin operations or when you need to bypass tenancy entirely:

```typescript
const rawRepo = repo.rawRepository;
const allTenants = await rawRepo.find(); // no tenant filter
```

### Example usage in a service

```typescript
import { Injectable } from '@nestjs/common';
import { TenantBaseRepository } from 'nestjs-mtenant';
import { User } from './entities/user.entity';
import { dataSource } from './data-source';

@Injectable()
export class UsersService {
  private readonly repo = new TenantBaseRepository<User>(User, dataSource);

  findAll(): Promise<User[]> {
    return this.repo.find();
  }

  findOne(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(dto: Partial<User>): Promise<User | User[]> {
    const user = this.repo.rawRepository.create(dto);
    return this.repo.save(user as User); // subscriber injects tenant
  }
}
```

---

## Tenant storage entity

To manage registered tenants in a TypeORM database, import and register `TenantsStorageTypeOrmEntity`:

```typescript
import { TenantsStorageTypeOrmEntity } from 'nestjs-mtenant';

// Add to your DataSource entities array
const dataSource = new DataSource({
  entities: [User, Book, TenantsStorageTypeOrmEntity],
  // ...
});
```

Then pass it to `MTModule`:

```typescript
MTModule.forRoot({
  for: [User, Book],
  storage: TYPEORM_STORAGE,
  storageRepository: TenantsStorageTypeOrmEntity,
  dataSource,
})
```

The entity maps to the `tenants_storage` table with columns: `id`, `tenant` (unique), `settings` (text), `createdAt`, `updatedAt`, `deletedAt` (soft-delete).

---

## Limitations

These are important differences from the Sequelize integration.

**No automatic read filtering without TenantBaseRepository.** Plain `dataSource.getRepository(User).find()` does NOT add a tenant filter. You must use `TenantBaseRepository` or add the `where` clause manually.

**QueryBuilder update / delete / insert bypass the subscriber.** The `TenantEntitySubscriber` only fires on entity-based operations. Raw QueryBuilder mutations do not trigger it:

```typescript
// Tenant NOT injected — use explicit where clause
await dataSource.createQueryBuilder()
  .update(User)
  .set({ username: 'new' })
  .where('id = :id', { id: 1 })
  .execute();
```

**Nested relation filtering is not automatic.** Unlike Sequelize, `TenantBaseRepository.find({ relations: ['books'] })` does not add a tenant filter on the `books` side. Query each relation explicitly or use `createQueryBuilder` with manual joins.

**Per-query disable.** There is no `{ disableTenancy: true }` option for TypeORM. Use `rawRepository` for unscoped access, or call `disableTenancyForCurrentScope()` on `MTService` to disable tenancy for the entire request scope.

```typescript
// Option 1: bypass via rawRepository
const all = await repo.rawRepository.find();

// Option 2: disable for current scope (all entities, all operations)
this.mtService.disableTenancyForCurrentScope();
```
