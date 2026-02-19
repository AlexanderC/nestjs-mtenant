---
layout: default
title: Swagger Integration
---

# Swagger Integration

`@MTApi()` is a composable decorator that enriches Swagger / OpenAPI documentation for controllers and routes that participate in multi-tenancy. It delegates to `@ApiHeader()` and, optionally, `@ApiQuery()` from `@nestjs/swagger`.

`@nestjs/swagger` must be installed as a peer dependency for this decorator to work.

---

## Basic usage

Apply `@MTApi()` to a controller class or to an individual route handler. The decorator adds an `X-Tenant-ID` header parameter to the Swagger UI for every operation in scope.

```typescript
import { Controller, Get } from '@nestjs/common';
import { MTApi } from 'nestjs-mtenant';

// Documents all routes in this controller as accepting X-Tenant-ID
@MTApi()
@Controller('books')
export class BooksController {
  @Get()
  findAll() { /* ... */ }
}
```

---

## Enabling query parameter support

Pass `{ includeQuery: true }` to also document the `tenant` query parameter. This mirrors the runtime behaviour: the module will read the tenant from the `?tenant=` query string when `includeQuery` is in use.

```typescript
import { Controller, Get } from '@nestjs/common';
import { MTApi } from 'nestjs-mtenant';

@Controller('books')
export class BooksController {
  // Documents both X-Tenant-ID header and ?tenant= query param
  @MTApi({ includeQuery: true })
  @Get()
  findAll() { /* ... */ }
}
```

---

## ApiOptions interface

```typescript
interface MTApiOptions {
  transport?: TenantTransport;     // default: 'http'
  headerName?: string;             // default: 'X-Tenant-ID'
  queryParameterName?: string;     // default: 'tenant'
  includeQuery?: boolean;          // default: false
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `transport` | `'http'` | Transport type. Only `'http'` is supported. |
| `headerName` | `'X-Tenant-ID'` | Name of the documented header. Should match your `MTModuleOptions.headerName`. |
| `queryParameterName` | `'tenant'` | Name of the documented query parameter. Should match `MTModuleOptions.queryParameterName`. |
| `includeQuery` | `false` | When `true`, also adds an `@ApiQuery()` decorator for the query parameter. |

---

## Customising header and query names

If you configured `MTModule` with custom header or query parameter names, pass the same values to `@MTApi()` so the Swagger documentation stays accurate:

```typescript
// module registration
MTModule.forRoot({
  for: [User],
  headerName: 'X-Org-ID',
  queryParameterName: 'org',
})

// controller
@MTApi({ headerName: 'X-Org-ID', queryParameterName: 'org', includeQuery: true })
@Controller('users')
export class UsersController {}
```

---

## Controller vs. route level

`@MTApi()` can be placed at either level. When placed on the controller class it applies to all operations. When placed on an individual route handler it applies to that operation only. Both placements can coexist.

```typescript
@MTApi()                          // header on all routes
@Controller('users')
export class UsersController {
  @Get()
  findAll() { /* ... */ }

  @MTApi({ includeQuery: true })  // header + query on this route
  @Get(':id')
  findOne() { /* ... */ }
}
```
