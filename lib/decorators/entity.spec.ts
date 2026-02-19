import 'reflect-metadata';
import {
  isTenantEntityMetadata,
  isTenantEntity,
  injectTenancyService,
  getTenancyService,
  Entity,
} from './entity';
import {
  TENANT_ENTITY_METADATA_FIELD,
  TENANT_ENTITY_OPTIONS_METADATA_FIELD,
  TENANCY_SERVICE_METADATA_FIELD,
  DEFAULT_ENTITY_OPTIONS,
} from './constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a fresh plain class so metadata never leaks between tests. */
function makeClass(name = 'TestEntity') {
  return class {} as Function & { new (...args: any[]): any };
}

/** Minimal MtenantService stub — only the shape matters for metadata storage. */
const makeMockService = () => ({
  tenancyScope: { tenant: 'test-tenant', enabled: true },
  tenancyOptions: { allowMissingTenant: false },
});

// ---------------------------------------------------------------------------
// isTenantEntityMetadata
// ---------------------------------------------------------------------------

describe('isTenantEntityMetadata', () => {
  it('returns false for a plain class', () => {
    expect(isTenantEntityMetadata(makeClass())).toBe(false);
  });

  it('returns false when the metadata field is absent', () => {
    const cls = makeClass();
    expect(isTenantEntityMetadata(cls)).toBe(false);
  });

  it('returns false when the metadata field is set to false', () => {
    const cls = makeClass();
    Reflect.defineMetadata(TENANT_ENTITY_METADATA_FIELD, false, cls);
    expect(isTenantEntityMetadata(cls)).toBe(false);
  });

  it('returns true when the metadata field is set to true', () => {
    const cls = makeClass();
    Reflect.defineMetadata(TENANT_ENTITY_METADATA_FIELD, true, cls);
    expect(isTenantEntityMetadata(cls)).toBe(true);
  });

  it('returns true for a class decorated with @Entity()', () => {
    @Entity()
    class DecoratedEntity {}

    expect(isTenantEntityMetadata(DecoratedEntity)).toBe(true);
  });

  it('returns false after switchTenancy(false) is called', () => {
    @Entity()
    class Toggled {}

    (Toggled as any).switchTenancy(false);
    expect(isTenantEntityMetadata(Toggled)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isTenantEntity
// ---------------------------------------------------------------------------

describe('isTenantEntity', () => {
  it('returns false for a plain class', () => {
    expect(isTenantEntity(makeClass())).toBe(false);
  });

  it('returns true for a class decorated with @Entity()', () => {
    @Entity()
    class Decorated {}

    expect(isTenantEntity(Decorated)).toBe(true);
  });

  it('returns false after switchTenancy(false)', () => {
    @Entity()
    class Toggled {}

    (Toggled as any).switchTenancy(false);
    expect(isTenantEntity(Toggled)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// injectTenancyService / getTenancyService
// ---------------------------------------------------------------------------

describe('injectTenancyService / getTenancyService', () => {
  it('getTenancyService returns null when no service has been injected', () => {
    @Entity()
    class NoService {}

    expect(getTenancyService(NoService as any)).toBeNull();
  });

  it('injectTenancyService stores the service in metadata', () => {
    @Entity()
    class WithService {}

    const service = makeMockService() as any;
    injectTenancyService(WithService as any, service);

    expect(
      Reflect.getMetadata(TENANCY_SERVICE_METADATA_FIELD, WithService),
    ).toBe(service);
  });

  it('getTenancyService returns the previously injected service', () => {
    @Entity()
    class ServiceHolder {}

    const service = makeMockService() as any;
    injectTenancyService(ServiceHolder as any, service);

    expect(getTenancyService(ServiceHolder as any)).toBe(service);
  });

  it('getTenancyService returns null for a plain (non-decorated) class', () => {
    expect(getTenancyService(makeClass() as any)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// @Entity() — static / prototype additions
// ---------------------------------------------------------------------------

describe('@Entity() decorator', () => {
  it('adds switchTenancy static method to the decorated class', () => {
    @Entity()
    class A {}

    expect(typeof (A as any).switchTenancy).toBe('function');
  });

  it('adds getTenant prototype method', () => {
    @Entity()
    class B {}

    expect(typeof (B.prototype as any).getTenant).toBe('function');
  });

  it('adds getTenantId prototype method', () => {
    @Entity()
    class C {}

    expect(typeof (C.prototype as any).getTenantId).toBe('function');
  });

  it('enables tenancy by default (TENANT_ENTITY_METADATA_FIELD === true)', () => {
    @Entity()
    class D {}

    expect(Reflect.getMetadata(TENANT_ENTITY_METADATA_FIELD, D)).toBe(true);
  });

  it('stores TenancyEntityOptions in TENANT_ENTITY_OPTIONS_METADATA_FIELD', () => {
    @Entity()
    class E {}

    const stored = Reflect.getMetadata(TENANT_ENTITY_OPTIONS_METADATA_FIELD, E);
    expect(stored).toEqual(DEFAULT_ENTITY_OPTIONS);
  });

  it('uses default tenantField and idField when no options provided', () => {
    @Entity()
    class F {}

    const stored = Reflect.getMetadata(TENANT_ENTITY_OPTIONS_METADATA_FIELD, F);
    expect(stored.tenantField).toBe(DEFAULT_ENTITY_OPTIONS.tenantField);
    expect(stored.idField).toBe(DEFAULT_ENTITY_OPTIONS.idField);
  });

  it('stores custom fields when options are provided', () => {
    @Entity({ tenantField: 'org', idField: 'uid' })
    class G {}

    const stored = Reflect.getMetadata(TENANT_ENTITY_OPTIONS_METADATA_FIELD, G);
    expect(stored.tenantField).toBe('org');
    expect(stored.idField).toBe('uid');
  });
});

// ---------------------------------------------------------------------------
// switchTenancy
// ---------------------------------------------------------------------------

describe('switchTenancy', () => {
  it('switchTenancy(false) sets TENANT_ENTITY_METADATA_FIELD to false', () => {
    @Entity()
    class H {}

    (H as any).switchTenancy(false);
    expect(Reflect.getMetadata(TENANT_ENTITY_METADATA_FIELD, H)).toBe(false);
  });

  it('switchTenancy(true) sets TENANT_ENTITY_METADATA_FIELD back to true', () => {
    @Entity()
    class I {}

    (I as any).switchTenancy(false);
    (I as any).switchTenancy(true);
    expect(Reflect.getMetadata(TENANT_ENTITY_METADATA_FIELD, I)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Instance prototype methods: getTenant / getTenantId
// ---------------------------------------------------------------------------

describe('instance methods on decorated class', () => {
  it('getTenant() returns the value of the default tenant field', () => {
    @Entity()
    class MyEntity {
      tenant = 'acme';
    }

    const instance = new MyEntity();
    expect((instance as any).getTenant()).toBe('acme');
  });

  it('getTenant() returns the value of the custom tenant field', () => {
    @Entity({ tenantField: 'org', idField: 'uid' })
    class OrgEntity {
      org = 'widgets-inc';
      uid = 42;
    }

    const instance = new OrgEntity();
    expect((instance as any).getTenant()).toBe('widgets-inc');
  });

  it('getTenantId() returns "tenant/id" format using default fields', () => {
    @Entity()
    class TenantIdEntity {
      tenant = 'root';
      id = 7;
    }

    const instance = new TenantIdEntity();
    expect((instance as any).getTenantId()).toBe('root/7');
  });

  it('getTenantId() returns "tenant/id" format using custom fields', () => {
    @Entity({ tenantField: 'org', idField: 'uid' })
    class CustomFieldEntity {
      org = 'acme';
      uid = 99;
    }

    const instance = new CustomFieldEntity();
    expect((instance as any).getTenantId()).toBe('acme/99');
  });
});
