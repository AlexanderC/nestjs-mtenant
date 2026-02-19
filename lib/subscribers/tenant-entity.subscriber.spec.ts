import 'reflect-metadata';
import { TenantEntitySubscriber } from './tenant-entity.subscriber';
import { TENANT_ENTITY_OPTIONS_METADATA_FIELD } from '../decorators/constants';

jest.mock('../decorators/entity', () => ({
  isTenantEntityMetadata: jest.fn(),
  getTenancyService: jest.fn(),
  injectTenancyService: jest.fn(),
  isTenantEntity: jest.fn(),
}));

import {
  isTenantEntityMetadata,
  getTenancyService,
} from '../decorators/entity';

const mockIsTenantEntityMetadata = isTenantEntityMetadata as jest.Mock;
const mockGetTenancyService = getTenancyService as jest.Mock;

class TestEntity {}

function buildMockService(
  overrides: Partial<{
    enabled: boolean;
    tenant: string;
  }> = {},
) {
  const { enabled = true, tenant = 'acme' } = overrides;
  return {
    tenancyScope: { enabled, tenant },
  };
}

function buildEvent(entity: any = {}, target: Function = TestEntity) {
  return {
    entity,
    metadata: { target },
  };
}

describe('TenantEntitySubscriber', () => {
  let subscriber: TenantEntitySubscriber;

  beforeEach(() => {
    subscriber = new TenantEntitySubscriber();
    jest.clearAllMocks();

    // Default: entity IS a tenant entity
    mockIsTenantEntityMetadata.mockReturnValue(true);

    // Default: tenancy service is set up with enabled=true and tenant='acme'
    mockGetTenancyService.mockReturnValue(buildMockService());

    // Default: metadata defines tenantField='tenant'
    Reflect.defineMetadata(
      TENANT_ENTITY_OPTIONS_METADATA_FIELD,
      { tenantField: 'tenant', idField: 'id' },
      TestEntity,
    );
  });

  afterEach(() => {
    Reflect.deleteMetadata(TENANT_ENTITY_OPTIONS_METADATA_FIELD, TestEntity);
  });

  // ---------------------------------------------------------------------------
  // beforeInsert()
  // ---------------------------------------------------------------------------
  describe('beforeInsert()', () => {
    it('sets tenant on entity when entity is a tenant entity', () => {
      const entity: any = {};
      subscriber.beforeInsert(buildEvent(entity));
      expect(entity.tenant).toBe('acme');
    });

    it('skips when entity is NOT a tenant entity', () => {
      mockIsTenantEntityMetadata.mockReturnValue(false);
      const entity: any = {};
      subscriber.beforeInsert(buildEvent(entity));
      expect(entity.tenant).toBeUndefined();
    });

    it('skips when tenancy is disabled for the current scope', () => {
      mockGetTenancyService.mockReturnValue(
        buildMockService({ enabled: false }),
      );
      const entity: any = {};
      subscriber.beforeInsert(buildEvent(entity));
      expect(entity.tenant).toBeUndefined();
    });

    it('does not overwrite an existing tenant value on the entity', () => {
      const entity: any = { tenant: 'existing-tenant' };
      subscriber.beforeInsert(buildEvent(entity));
      // Should remain unchanged
      expect(entity.tenant).toBe('existing-tenant');
    });

    it('sets tenant on the correct field when tenantField is customised', () => {
      class CustomEntity {}
      Reflect.defineMetadata(
        TENANT_ENTITY_OPTIONS_METADATA_FIELD,
        { tenantField: 'orgId', idField: 'id' },
        CustomEntity,
      );
      const entity: any = {};
      subscriber.beforeInsert(buildEvent(entity, CustomEntity));
      expect(entity.orgId).toBe('acme');
      Reflect.deleteMetadata(
        TENANT_ENTITY_OPTIONS_METADATA_FIELD,
        CustomEntity,
      );
    });

    it('skips gracefully when getTenancyService returns null', () => {
      mockGetTenancyService.mockReturnValue(null);
      const entity: any = {};
      expect(() => subscriber.beforeInsert(buildEvent(entity))).not.toThrow();
      expect(entity.tenant).toBeUndefined();
    });

    it('skips gracefully when metadata has no target', () => {
      const entity: any = {};
      const event = { entity, metadata: { target: undefined } };
      expect(() => subscriber.beforeInsert(event)).not.toThrow();
    });

    it('skips gracefully when entity options metadata is absent', () => {
      // Remove the entity options metadata so applyTenantToEntity finds nothing
      Reflect.deleteMetadata(TENANT_ENTITY_OPTIONS_METADATA_FIELD, TestEntity);
      const entity: any = {};
      expect(() => subscriber.beforeInsert(buildEvent(entity))).not.toThrow();
      expect(entity.tenant).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // beforeUpdate()
  // ---------------------------------------------------------------------------
  describe('beforeUpdate()', () => {
    it('sets tenant when entity is present', () => {
      const entity: any = {};
      subscriber.beforeUpdate(buildEvent(entity));
      expect(entity.tenant).toBe('acme');
    });

    it('handles undefined entity without throwing (early return)', () => {
      const event = { entity: undefined, metadata: { target: TestEntity } };
      expect(() => subscriber.beforeUpdate(event)).not.toThrow();
    });

    it('skips when tenancy is disabled', () => {
      mockGetTenancyService.mockReturnValue(
        buildMockService({ enabled: false }),
      );
      const entity: any = {};
      subscriber.beforeUpdate(buildEvent(entity));
      expect(entity.tenant).toBeUndefined();
    });

    it('does not overwrite existing tenant value', () => {
      const entity: any = { tenant: 'original' };
      subscriber.beforeUpdate(buildEvent(entity));
      expect(entity.tenant).toBe('original');
    });
  });

  // ---------------------------------------------------------------------------
  // beforeRemove()
  // ---------------------------------------------------------------------------
  describe('beforeRemove()', () => {
    it('sets tenant on entity when entity is present', () => {
      const entity: any = {};
      subscriber.beforeRemove(buildEvent(entity));
      expect(entity.tenant).toBe('acme');
    });

    it('handles undefined entity without throwing (early return)', () => {
      const event = { entity: undefined, metadata: { target: TestEntity } };
      expect(() => subscriber.beforeRemove(event)).not.toThrow();
    });

    it('skips when tenancy is disabled', () => {
      mockGetTenancyService.mockReturnValue(
        buildMockService({ enabled: false }),
      );
      const entity: any = {};
      subscriber.beforeRemove(buildEvent(entity));
      expect(entity.tenant).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // beforeSoftRemove()
  // ---------------------------------------------------------------------------
  describe('beforeSoftRemove()', () => {
    it('sets tenant on entity when entity is present', () => {
      const entity: any = {};
      subscriber.beforeSoftRemove(buildEvent(entity));
      expect(entity.tenant).toBe('acme');
    });

    it('handles undefined entity without throwing (early return)', () => {
      const event = { entity: undefined, metadata: { target: TestEntity } };
      expect(() => subscriber.beforeSoftRemove(event)).not.toThrow();
    });

    it('skips when tenancy is disabled', () => {
      mockGetTenancyService.mockReturnValue(
        buildMockService({ enabled: false }),
      );
      const entity: any = {};
      subscriber.beforeSoftRemove(buildEvent(entity));
      expect(entity.tenant).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // applyTenantToEntity edge-cases (tested through beforeInsert)
  // ---------------------------------------------------------------------------
  describe('applyTenantToEntity edge-cases', () => {
    it('uses the current scope tenant at time of call', () => {
      mockGetTenancyService.mockReturnValue(
        buildMockService({ tenant: 'globex' }),
      );
      const entity: any = {};
      subscriber.beforeInsert(buildEvent(entity));
      expect(entity.tenant).toBe('globex');
    });

    it('does not call getTenancyService when isTenantEntityMetadata returns false', () => {
      mockIsTenantEntityMetadata.mockReturnValue(false);
      const entity: any = {};
      subscriber.beforeInsert(buildEvent(entity));
      expect(mockGetTenancyService).not.toHaveBeenCalled();
    });
  });
});
