import {
  getTenancyService,
  isTenantEntityMetadata,
} from '../decorators/entity';
import { TenancyEntityOptions } from '../interfaces/core.interface';
import { TENANT_ENTITY_OPTIONS_METADATA_FIELD } from '../decorators/constants';
import { MtenantService } from '../mtenant.service';

export class TenantEntitySubscriber {
  beforeInsert(event: any): void {
    this.applyTenantToEntity(event.metadata?.target, event.entity);
  }

  beforeUpdate(event: any): void {
    if (!event.entity) return;
    this.applyTenantToEntity(event.metadata?.target, event.entity);
  }

  beforeRemove(event: any): void {
    if (!event.entity) return;
    this.applyTenantToEntity(event.metadata?.target, event.entity);
  }

  beforeSoftRemove(event: any): void {
    if (!event.entity) return;
    this.applyTenantToEntity(event.metadata?.target, event.entity);
  }

  private applyTenantToEntity(target: Function | undefined, entity: any): void {
    if (!target || !entity) return;

    // Check if this entity class has been decorated with @MTEntity()
    if (!isTenantEntityMetadata(target)) return;

    const service: MtenantService = getTenancyService(target as any);
    if (!service) return;

    // Tenancy might be disabled globally or per-scope
    if (!service.tenancyScope.enabled) return;

    const options: TenancyEntityOptions = Reflect.getMetadata(
      TENANT_ENTITY_OPTIONS_METADATA_FIELD,
      target,
    );
    if (!options) return;

    // Only set if not already present (same pattern as Sequelize hooks)
    if (!entity[options.tenantField]) {
      entity[options.tenantField] = service.tenancyScope.tenant;
    }
  }
}
