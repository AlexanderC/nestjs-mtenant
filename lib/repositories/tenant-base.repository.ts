import { getTenancyService } from '../decorators/entity';
import { TenancyEntityOptions } from '../interfaces/core.interface';
import { MtenantService } from '../mtenant.service';
import { TENANT_ENTITY_OPTIONS_METADATA_FIELD } from '../decorators/constants';

export class TenantBaseRepository<T> {
  private readonly repository: any;
  private readonly tenantOptions: TenancyEntityOptions;
  private readonly service: MtenantService;

  constructor(entity: Function, dataSource: any) {
    this.repository = dataSource.getRepository(entity);

    const target =
      typeof entity === 'function' ? entity : this.repository.metadata?.target;
    this.service = getTenancyService(target as any);
    this.tenantOptions = Reflect.getMetadata(
      TENANT_ENTITY_OPTIONS_METADATA_FIELD,
      target,
    );
  }

  get rawRepository(): any {
    return this.repository;
  }

  async find(options?: any): Promise<T[]> {
    return this.repository.find(this.injectTenantWhere(options));
  }

  async findOne(options: any): Promise<T | null> {
    return this.repository.findOne(this.injectTenantWhere(options));
  }

  async findAndCount(options?: any): Promise<[T[], number]> {
    return this.repository.findAndCount(this.injectTenantWhere(options));
  }

  async findBy(where: any): Promise<T[]> {
    return this.repository.findBy(this.injectTenantWhereClause(where));
  }

  async findOneBy(where: any): Promise<T | null> {
    return this.repository.findOneBy(this.injectTenantWhereClause(where));
  }

  async count(options?: any): Promise<number> {
    return this.repository.count(this.injectTenantWhere(options));
  }

  createQueryBuilder(alias?: string): any {
    const qb = this.repository.createQueryBuilder(alias);
    return this.applyTenantToQueryBuilder(qb, alias);
  }

  async save(entity: T | T[]): Promise<T | T[]> {
    return this.repository.save(entity);
  }

  async remove(entity: T | T[]): Promise<T | T[]> {
    return this.repository.remove(entity);
  }

  async softRemove(entity: T | T[]): Promise<T | T[]> {
    return this.repository.softRemove(entity);
  }

  private shouldSkip(): boolean {
    return (
      !this.service || !this.tenantOptions || !this.service.tenancyScope.enabled
    );
  }

  private injectTenantWhere(options?: any): any {
    if (this.shouldSkip()) return options;

    const opts = { ...(options || {}) };
    const tenant = this.service.tenancyScope.tenant;
    const field = this.tenantOptions.tenantField;

    if (this.service.tenancyOptions.allowMissingTenant) {
      const existingWhere = opts.where || {};
      opts.where = [
        { ...existingWhere, [field]: tenant },
        { ...existingWhere, [field]: null },
      ];
    } else {
      opts.where = {
        ...(opts.where || {}),
        [field]: tenant,
      };
    }

    return opts;
  }

  private injectTenantWhereClause(where: any): any {
    if (this.shouldSkip()) return where;

    const tenant = this.service.tenancyScope.tenant;
    const field = this.tenantOptions.tenantField;

    if (Array.isArray(where)) {
      if (this.service.tenancyOptions.allowMissingTenant) {
        return where.flatMap((w: any) => [
          { ...w, [field]: tenant },
          { ...w, [field]: null },
        ]);
      }
      return where.map((w: any) => ({ ...w, [field]: tenant }));
    }

    if (this.service.tenancyOptions.allowMissingTenant) {
      return [
        { ...where, [field]: tenant },
        { ...where, [field]: null },
      ];
    }

    return { ...where, [field]: tenant };
  }

  private applyTenantToQueryBuilder(qb: any, alias?: string): any {
    if (this.shouldSkip()) return qb;

    const tenant = this.service.tenancyScope.tenant;
    const field = this.tenantOptions.tenantField;
    const prefix = alias ? `${alias}.` : '';

    if (this.service.tenancyOptions.allowMissingTenant) {
      qb.andWhere(
        `(${prefix}${field} = :__mt_tenant OR ${prefix}${field} IS NULL)`,
        { __mt_tenant: tenant },
      );
    } else {
      qb.andWhere(`${prefix}${field} = :__mt_tenant`, {
        __mt_tenant: tenant,
      });
    }

    return qb;
  }
}
