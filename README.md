<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  NestJS module for multi-tenancy with deep integration into Sequelize and TypeORM.
</p>

<p align="center">
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/v/nestjs-mtenant.svg" alt="NPM Version" /></a>
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/l/nestjs-mtenant.svg" alt="Package License" /></a>
  <a href="https://npmjs.com/package/nestjs-mtenant"><img src="https://img.shields.io/npm/dm/nestjs-mtenant.svg" alt="NPM Downloads" /></a>
</p>

## Features

- Automatic tenant injection into all Sequelize and TypeORM operations
- Header and query parameter based tenant extraction
- Transparent Sequelize hooks (8 hooks covering all CRUD operations)
- TypeORM subscriber for writes + `TenantBaseRepository` for reads
- Pluggable storage (Sequelize, TypeORM) with optional caching (IoRedis)
- Swagger integration via `@MTApi()` decorator
- Per-operation, per-scope, and global tenancy control

## Compatibility

| nestjs-mtenant | NestJS | Node.js | Sequelize | TypeORM |
|:-:|:-:|:-:|:-:|:-:|
| 1.x | 11.x | >= 20 | 6.x | 0.3.x |
| 0.x | 9.x - 10.x | >= 14 | 6.x | - |

## Installation

```sh
npm install nestjs-mtenant nestjs-cls

# For Sequelize support:
npm install sequelize sequelize-typescript

# For TypeORM support:
npm install typeorm
```

## Documentation

Full documentation is available on [GitHub Pages](https://alexanderc.github.io/nestjs-mtenant/).

- [Getting Started](https://alexanderc.github.io/nestjs-mtenant/getting-started)
- [Configuration](https://alexanderc.github.io/nestjs-mtenant/configuration)
- [Sequelize Integration](https://alexanderc.github.io/nestjs-mtenant/sequelize)
- [TypeORM Integration](https://alexanderc.github.io/nestjs-mtenant/typeorm)
- [Storage & Caching](https://alexanderc.github.io/nestjs-mtenant/storage)
- [Swagger Integration](https://alexanderc.github.io/nestjs-mtenant/api-decorator)
- [Advanced Usage](https://alexanderc.github.io/nestjs-mtenant/advanced-usage)
- [Migration Guide (v0.x to v1.0)](https://alexanderc.github.io/nestjs-mtenant/migration-guide)

## Test Coverage

```
Statements : 92.89% (471/507)
Branches   : 97.02% (196/202)
Functions  : 98.27% (114/116)
Lines      : 92.84% (467/503)
```

## Девелопмент

```sh
# Run tests
npm test

# Build
npm run build

# Release
npm run format
npm run release    # or: npm run patch | minor | major
npm run deploy
```

## Contributing

- [Alex Cucer](https://github.com/AlexanderC)

## License

MIT
