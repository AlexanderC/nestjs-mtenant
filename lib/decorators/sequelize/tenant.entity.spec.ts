import 'reflect-metadata';

// ---------------------------------------------------------------------------
// Mock the entity module so we can control isTenantEntity / getTenancyService
// ---------------------------------------------------------------------------
jest.mock('../entity', () => ({
  isTenantEntity: jest.fn(),
  getTenancyService: jest.fn(),
}));

// Mock sequelize-typescript addHook
jest.mock('sequelize-typescript', () => ({
  Model: class Model {},
  addHook: jest.fn(),
}));

// Mock sequelize Op
jest.mock('sequelize', () => ({
  Op: {
    in: Symbol('in'),
  },
}));

import * as Sequelize from 'sequelize';
import { addHook } from 'sequelize-typescript';
import { isTenantEntity, getTenancyService } from '../entity';
import {
  injectInstanceWithTenantProperty,
  injectQueryScopeWithTenantProperty,
  beforeCreate,
  beforeBulkCreate,
  beforeUpdate,
  beforeBulkUpdate,
  beforeDestroy,
  beforeBulkDestroy,
  beforeUpsert,
  beforeFindAfterExpandIncludeAll,
  enhanceTenantEntity,
} from './tenant.entity';
import { DISABLE_TENANCY_OPTION } from '../constants';

// ---------------------------------------------------------------------------
// Typed references to the mocked functions
// ---------------------------------------------------------------------------
const mockedIsTenantEntity = isTenantEntity as jest.MockedFunction<
  typeof isTenantEntity
>;
const mockedGetTenancyService = getTenancyService as jest.MockedFunction<
  typeof getTenancyService
>;
const mockedAddHook = addHook as jest.MockedFunction<typeof addHook>;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const DEFAULT_TENANCY_OPTIONS = { tenantField: 'tenant', idField: 'id' };

function makeMockService(
  overrides: Partial<{
    tenant: string;
    enabled: boolean;
    allowMissingTenant: boolean;
  }> = {},
) {
  return {
    tenancyScope: {
      tenant: overrides.tenant ?? 'test-tenant',
      enabled: overrides.enabled ?? true,
    },
    tenancyOptions: {
      allowMissingTenant: overrides.allowMissingTenant ?? false,
    },
  };
}

// A minimal stand-in for typeof Model — shape only needs to satisfy the call.
const mockTarget = class MockTarget {} as any;

function resetMocks() {
  mockedIsTenantEntity.mockReset();
  mockedGetTenancyService.mockReset();
  mockedAddHook.mockReset();
}

// ---------------------------------------------------------------------------
// injectInstanceWithTenantProperty
// ---------------------------------------------------------------------------

describe('injectInstanceWithTenantProperty', () => {
  beforeEach(() => {
    resetMocks();
    mockedIsTenantEntity.mockReturnValue(true);
    mockedGetTenancyService.mockReturnValue(makeMockService() as any);
  });

  it('sets the tenant field when entity is a tenant entity and tenancy is enabled', () => {
    const attributes: any = {};
    injectInstanceWithTenantProperty(
      attributes,
      {},
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(attributes.tenant).toBe('test-tenant');
  });

  it('does not modify attributes when isTenantEntity returns false', () => {
    mockedIsTenantEntity.mockReturnValue(false);
    const attributes: any = {};
    injectInstanceWithTenantProperty(
      attributes,
      {},
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(attributes.tenant).toBeUndefined();
  });

  it('does not modify attributes when disableTenancy option is set', () => {
    const attributes: any = {};
    const options: any = { [DISABLE_TENANCY_OPTION]: true };
    injectInstanceWithTenantProperty(
      attributes,
      options,
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(attributes.tenant).toBeUndefined();
  });

  it('does not modify attributes when tenancyScope.enabled is false', () => {
    mockedGetTenancyService.mockReturnValue(
      makeMockService({ enabled: false }) as any,
    );
    const attributes: any = {};
    injectInstanceWithTenantProperty(
      attributes,
      {},
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(attributes.tenant).toBeUndefined();
  });

  it('does not overwrite an existing tenant value in attributes', () => {
    const attributes: any = { tenant: 'already-set' };
    injectInstanceWithTenantProperty(
      attributes,
      {},
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(attributes.tenant).toBe('already-set');
  });

  it('removes the disableTenancy key from options after reading it', () => {
    const attributes: any = {};
    const options: any = { [DISABLE_TENANCY_OPTION]: true, other: 'value' };
    injectInstanceWithTenantProperty(
      attributes,
      options,
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(options[DISABLE_TENANCY_OPTION]).toBeUndefined();
    expect(options.other).toBe('value');
  });

  it('uses a custom tenantField from tenancyOptions', () => {
    const attributes: any = {};
    injectInstanceWithTenantProperty(attributes, {}, mockTarget, {
      tenantField: 'org',
      idField: 'uid',
    });
    expect(attributes.org).toBe('test-tenant');
    expect(attributes.tenant).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// injectQueryScopeWithTenantProperty
// ---------------------------------------------------------------------------

describe('injectQueryScopeWithTenantProperty', () => {
  beforeEach(() => {
    resetMocks();
    mockedIsTenantEntity.mockReturnValue(true);
    mockedGetTenancyService.mockReturnValue(makeMockService() as any);
  });

  it('adds a where clause with the tenant value', () => {
    const options: any = {};
    injectQueryScopeWithTenantProperty(
      options,
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(options.where).toBeDefined();
    expect(options.where.tenant).toBe('test-tenant');
  });

  it('uses Op.in with [tenant, null] when allowMissingTenant is true', () => {
    mockedGetTenancyService.mockReturnValue(
      makeMockService({ allowMissingTenant: true }) as any,
    );
    const options: any = {};
    injectQueryScopeWithTenantProperty(
      options,
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(options.where.tenant).toEqual({
      [Sequelize.Op.in]: ['test-tenant', null],
    });
  });

  it('uses exact match when allowMissingTenant is false', () => {
    mockedGetTenancyService.mockReturnValue(
      makeMockService({ allowMissingTenant: false }) as any,
    );
    const options: any = {};
    injectQueryScopeWithTenantProperty(
      options,
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(options.where.tenant).toBe('test-tenant');
  });

  it('does not add where clause when isTenantEntity returns false', () => {
    mockedIsTenantEntity.mockReturnValue(false);
    const options: any = {};
    injectQueryScopeWithTenantProperty(
      options,
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(options.where).toBeUndefined();
  });

  it('does not add where clause when tenancy is disabled via option', () => {
    const options: any = { [DISABLE_TENANCY_OPTION]: true };
    injectQueryScopeWithTenantProperty(
      options,
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect((options.where || {}).tenant).toBeUndefined();
  });

  it('does not add where clause when tenancyScope.enabled is false', () => {
    mockedGetTenancyService.mockReturnValue(
      makeMockService({ enabled: false }) as any,
    );
    const options: any = {};
    injectQueryScopeWithTenantProperty(
      options,
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect((options.where || {}).tenant).toBeUndefined();
  });

  it('does not overwrite an existing tenant where clause', () => {
    const options: any = { where: { tenant: 'pre-existing' } };
    injectQueryScopeWithTenantProperty(
      options,
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(options.where.tenant).toBe('pre-existing');
  });

  it('initialises options.where when the options object has no where key', () => {
    const options: any = { limit: 10 };
    injectQueryScopeWithTenantProperty(
      options,
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    expect(options.where).toBeDefined();
    expect(options.where.tenant).toBe('test-tenant');
  });

  it('handles null/undefined options gracefully', () => {
    // When options is null/undefined the function should still work because it
    // does the null-coalescing internally.
    // The function re-assigns `options = options || {}`, but it does NOT mutate
    // the caller's reference — that is acceptable behaviour; we just verify no
    // exception is thrown.
    expect(() =>
      injectQueryScopeWithTenantProperty(
        null as any,
        mockTarget,
        DEFAULT_TENANCY_OPTIONS,
      ),
    ).not.toThrow();
  });

  describe('recursive include handling', () => {
    it('injects tenant into nested includes recursively', () => {
      // Re-use the same mockTarget as the nested model so the mock returns true.
      const options: any = {
        include: [{ model: mockTarget, where: {} }],
      };
      injectQueryScopeWithTenantProperty(
        options,
        mockTarget,
        DEFAULT_TENANCY_OPTIONS,
      );
      expect(options.include[0].where.tenant).toBe('test-tenant');
    });

    it('skips nested include when isTenantEntity returns false for the nested model', () => {
      const nestedModel = class NestedModel {} as any;
      mockedIsTenantEntity
        // First call: top-level entity (true)
        .mockReturnValueOnce(true)
        // Second call: nested model (false)
        .mockReturnValueOnce(false);

      const options: any = {
        include: [{ model: nestedModel, where: {} }],
      };
      injectQueryScopeWithTenantProperty(
        options,
        mockTarget,
        DEFAULT_TENANCY_OPTIONS,
      );
      expect(options.include[0].where.tenant).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Hook factory functions — closure behaviour
// ---------------------------------------------------------------------------

describe('beforeCreate hook factory', () => {
  beforeEach(() => {
    resetMocks();
    mockedIsTenantEntity.mockReturnValue(true);
    mockedGetTenancyService.mockReturnValue(makeMockService() as any);
  });

  it('returns a function', () => {
    expect(typeof beforeCreate(mockTarget, DEFAULT_TENANCY_OPTIONS)).toBe(
      'function',
    );
  });

  it('returned closure calls injectInstanceWithTenantProperty', () => {
    const hook = beforeCreate(mockTarget, DEFAULT_TENANCY_OPTIONS);
    const attributes: any = {};
    hook(attributes, {});
    expect(attributes.tenant).toBe('test-tenant');
  });
});

describe('beforeBulkCreate hook factory', () => {
  beforeEach(() => {
    resetMocks();
    mockedIsTenantEntity.mockReturnValue(true);
    mockedGetTenancyService.mockReturnValue(makeMockService() as any);
  });

  it('returns a function', () => {
    expect(typeof beforeBulkCreate(mockTarget, DEFAULT_TENANCY_OPTIONS)).toBe(
      'function',
    );
  });

  it('sets tenant on every item in the array', () => {
    const hook = beforeBulkCreate(mockTarget, DEFAULT_TENANCY_OPTIONS);
    const items: any[] = [{}, {}, {}];
    hook(items, {});
    for (const item of items) {
      expect(item.tenant).toBe('test-tenant');
    }
  });

  it('handles an empty items array without error', () => {
    const hook = beforeBulkCreate(mockTarget, DEFAULT_TENANCY_OPTIONS);
    expect(() => hook([], {})).not.toThrow();
  });
});

describe('beforeUpdate hook factory', () => {
  beforeEach(() => {
    resetMocks();
    mockedIsTenantEntity.mockReturnValue(true);
    mockedGetTenancyService.mockReturnValue(makeMockService() as any);
  });

  it('returns a function', () => {
    expect(typeof beforeUpdate(mockTarget, DEFAULT_TENANCY_OPTIONS)).toBe(
      'function',
    );
  });

  it('injects tenant into attributes', () => {
    const hook = beforeUpdate(mockTarget, DEFAULT_TENANCY_OPTIONS);
    const attributes: any = {};
    hook(attributes, {});
    expect(attributes.tenant).toBe('test-tenant');
  });
});

describe('beforeBulkUpdate hook factory', () => {
  beforeEach(() => {
    resetMocks();
    mockedIsTenantEntity.mockReturnValue(true);
    mockedGetTenancyService.mockReturnValue(makeMockService() as any);
  });

  it('returns a function', () => {
    expect(typeof beforeBulkUpdate(mockTarget, DEFAULT_TENANCY_OPTIONS)).toBe(
      'function',
    );
  });

  it('calls injectQueryScopeWithTenantProperty (adds where clause)', () => {
    const hook = beforeBulkUpdate(mockTarget, DEFAULT_TENANCY_OPTIONS);
    const options: any = {};
    hook(options);
    expect(options.where).toBeDefined();
    expect(options.where.tenant).toBe('test-tenant');
  });
});

describe('beforeDestroy hook factory', () => {
  beforeEach(() => {
    resetMocks();
    mockedIsTenantEntity.mockReturnValue(true);
    mockedGetTenancyService.mockReturnValue(makeMockService() as any);
  });

  it('returns a function', () => {
    expect(typeof beforeDestroy(mockTarget, DEFAULT_TENANCY_OPTIONS)).toBe(
      'function',
    );
  });

  it('injects tenant into attributes', () => {
    const hook = beforeDestroy(mockTarget, DEFAULT_TENANCY_OPTIONS);
    const attributes: any = {};
    hook(attributes, {});
    expect(attributes.tenant).toBe('test-tenant');
  });
});

describe('beforeBulkDestroy hook factory', () => {
  beforeEach(() => {
    resetMocks();
    mockedIsTenantEntity.mockReturnValue(true);
    mockedGetTenancyService.mockReturnValue(makeMockService() as any);
  });

  it('returns a function', () => {
    expect(typeof beforeBulkDestroy(mockTarget, DEFAULT_TENANCY_OPTIONS)).toBe(
      'function',
    );
  });

  it('calls injectQueryScopeWithTenantProperty', () => {
    const hook = beforeBulkDestroy(mockTarget, DEFAULT_TENANCY_OPTIONS);
    const options: any = {};
    hook(options);
    expect(options.where.tenant).toBe('test-tenant');
  });
});

describe('beforeUpsert hook factory', () => {
  beforeEach(() => {
    resetMocks();
    mockedIsTenantEntity.mockReturnValue(true);
    mockedGetTenancyService.mockReturnValue(makeMockService() as any);
  });

  it('returns a function', () => {
    expect(typeof beforeUpsert(mockTarget, DEFAULT_TENANCY_OPTIONS)).toBe(
      'function',
    );
  });

  it('injects tenant into attributes and adds a where clause', () => {
    const hook = beforeUpsert(mockTarget, DEFAULT_TENANCY_OPTIONS);
    const attributes: any = {};
    const options: any = {};
    hook(attributes, options);
    // injectInstanceWithTenantProperty path
    expect(attributes.tenant).toBe('test-tenant');
    // injectQueryScopeWithTenantProperty path
    expect(options.where.tenant).toBe('test-tenant');
  });
});

describe('beforeFindAfterExpandIncludeAll hook factory', () => {
  beforeEach(() => {
    resetMocks();
    mockedIsTenantEntity.mockReturnValue(true);
    mockedGetTenancyService.mockReturnValue(makeMockService() as any);
  });

  it('returns a function', () => {
    expect(
      typeof beforeFindAfterExpandIncludeAll(
        mockTarget,
        DEFAULT_TENANCY_OPTIONS,
      ),
    ).toBe('function');
  });

  it('calls injectQueryScopeWithTenantProperty', () => {
    const hook = beforeFindAfterExpandIncludeAll(
      mockTarget,
      DEFAULT_TENANCY_OPTIONS,
    );
    const options: any = {};
    hook(options);
    expect(options.where.tenant).toBe('test-tenant');
  });
});

// ---------------------------------------------------------------------------
// enhanceTenantEntity
// ---------------------------------------------------------------------------

describe('enhanceTenantEntity', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('registers all expected hooks via addHook', () => {
    const target: any = class EnhancedModel {};
    enhanceTenantEntity(target, DEFAULT_TENANCY_OPTIONS);

    expect(mockedAddHook).toHaveBeenCalledTimes(8);
  });

  it('registers a beforeCreate hook', () => {
    const target: any = class EnhancedModel {};
    enhanceTenantEntity(target, DEFAULT_TENANCY_OPTIONS);

    const hookNames = mockedAddHook.mock.calls.map((c) => c[1]);
    expect(hookNames).toContain('beforeCreate');
  });

  it('registers a beforeBulkCreate hook', () => {
    const target: any = class EnhancedModel {};
    enhanceTenantEntity(target, DEFAULT_TENANCY_OPTIONS);

    const hookNames = mockedAddHook.mock.calls.map((c) => c[1]);
    expect(hookNames).toContain('beforeBulkCreate');
  });

  it('registers a beforeFindAfterExpandIncludeAll hook', () => {
    const target: any = class EnhancedModel {};
    enhanceTenantEntity(target, DEFAULT_TENANCY_OPTIONS);

    const hookNames = mockedAddHook.mock.calls.map((c) => c[1]);
    expect(hookNames).toContain('beforeFindAfterExpandIncludeAll');
  });

  it('attaches the hook handler method directly on the target class', () => {
    const target: any = class EnhancedModel {};
    enhanceTenantEntity(target, DEFAULT_TENANCY_OPTIONS);

    // Each addHook call receives (target, hookName, methodName).
    // The method name is stored on the target class.
    for (const call of mockedAddHook.mock.calls) {
      const methodName = call[2];
      expect(typeof target[methodName]).toBe('function');
    }
  });
});
