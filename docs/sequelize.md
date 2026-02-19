---
layout: default
title: Sequelize Integration
---

# Sequelize Integration

## @MTEntity() decorator

Apply `@MTEntity()` before `@Table()` on any Sequelize model class that should be tenant-scoped. The decorator:

1. Stores tenancy metadata used by the hooks.
2. Registers 8 Sequelize lifecycle hooks on the model class.
3. Adds `getTenant()` and `getTenantId()` to the model prototype.
4. Implements the static `switchTenancy()` method.

```typescript
import { MTEntity } from 'nestjs-mtenant';
import { Table, Column, Model, DataType } from 'sequelize-typescript';

// Default fields: tenantField='tenant', idField='id'
@MTEntity()
@Table({})
export class Book extends Model<Book> {
  @Column id: string;
  @Column tenant: string;
  @Column title: string;
}

// Custom field names
@MTEntity({ tenantField: 'org_id', idField: 'uuid' })
@Table({})
export class Invoice extends Model<Invoice> {
  @Column uuid: string;
  @Column org_id: string;
  @Column amount: number;
}
```

### TenantEntity interface

After decoration every instance exposes:

```typescript
interface TenantEntity {
  getTenant(): string;    // e.g. "acme"
  getTenantId(): string;  // e.g. "acme/42"
}
```

---

## How hooks work

The decorator registers the following 8 Sequelize hooks. You do not need to define them yourself.

| Hook | Scope injected |
|------|----------------|
| `beforeCreate` | Sets `tenant` on the new instance |
| `beforeBulkCreate` | Sets `tenant` on each instance |
| `beforeUpdate` | Sets `tenant` on the updated instance |
| `beforeBulkUpdate` | Adds `WHERE tenant = ?` to the update |
| `beforeUpsert` | Sets `tenant` on the instance and adds `WHERE` clause |
| `beforeDestroy` | Sets `tenant` on the instance before deletion |
| `beforeBulkDestroy` | Adds `WHERE tenant = ?` to the delete |
| `beforeFindAfterExpandIncludeAll` | Adds `WHERE tenant = ?` to the select |

For read operations, when `allowMissingTenant: true` (default), the clause becomes `WHERE tenant IN (:tenant, NULL)` so that global (unscoped) rows are always returned alongside tenant-specific ones.

---

## Automatic query scoping

All Sequelize operations go through the hooks above without any code changes in your services:

```typescript
// SELECT * FROM "books" WHERE tenant = 'acme'
const books = await Book.findAll();

// INSERT INTO "books" (tenant, title) VALUES ('acme', 'My Book')
const book = await Book.create({ title: 'My Book' });

// UPDATE "books" SET title = 'Updated' WHERE tenant = 'acme' AND id = 1
await Book.update({ title: 'Updated' }, { where: { id: 1 } });
```

---

## Nested includes

Tenancy is automatically applied to nested associations when using `include`. Each included model that is also decorated with `@MTEntity()` receives its own `WHERE tenant = ?` clause.

```typescript
// Both User and Book WHERE clauses are injected
const users = await User.findAll({
  include: [{ model: Book }],
});
```

To disable tenancy on a specific nested model only:

```typescript
const users = await User.findAll({
  include: [{ model: Book, disableTenancy: true }],
});
```

---

## Per-operation disable

Pass `{ disableTenancy: true }` in the options object of any Sequelize call to bypass tenant injection for that single operation:

```typescript
// Reads all books regardless of tenant (e.g. admin export)
const allBooks = await Book.findAll({ disableTenancy: true });

// Bulk operations
await Book.bulkCreate(records, { disableTenancy: true });

// Destroy without tenant filter
await Book.destroy({ where: { expired: true }, disableTenancy: true });
```

---

## Global model toggle

Disable tenancy for an entire model class for the lifetime of the process. Useful for seeding or migration scripts.

```typescript
import { Book } from './models/book.model';

Book.switchTenancy(false);
// All subsequent queries on Book are un-scoped

Book.switchTenancy(true);
// Tenancy is restored
```

---

## Tenant storage model

To store and manage registered tenants in a Sequelize database, extend `TenantsStorageSequelizeModel`:

```typescript
// models/tenants-storage.model.ts
import { TenantsStorageSequelizeModel } from 'nestjs-mtenant';

export class TenantsStorage extends TenantsStorageSequelizeModel<TenantsStorage> {}
```

Register it in your Sequelize connection alongside your other models, then pass it to `MTModule`:

```typescript
MTModule.forRoot({
  for: [User, Book],
  storage: SEQUELIZE_STORAGE,
  storageRepository: TenantsStorage,
})
```

The underlying table schema (`tenants_storage`) includes `id`, `tenant` (unique), `settings` (BLOB), `createdAt`, `updatedAt`, and soft-delete via `deletedAt`.

> See [Storage & Caching](storage) for the full Storage interface and how to interact with stored tenants programmatically.
