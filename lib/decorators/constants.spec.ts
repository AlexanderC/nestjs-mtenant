import {
  DISABLE_TENANCY_OPTION,
  TENANCY_SERVICE_METADATA_FIELD,
  TENANT_ENTITY_METADATA_FIELD,
  HOOK_METHOD_PREFIX,
  TENANT_FIELD,
  ID_FIELD,
  TENANT_ENTITY_OPTIONS_METADATA_FIELD,
  DEFAULT_ENTITY_OPTIONS,
} from './constants';

describe('decorator constants', () => {
  describe('DISABLE_TENANCY_OPTION', () => {
    it('should equal "disableTenancy"', () => {
      expect(DISABLE_TENANCY_OPTION).toBe('disableTenancy');
    });
  });

  describe('TENANCY_SERVICE_METADATA_FIELD', () => {
    it('should equal "$$MT_TENANCY_SERVICE$$"', () => {
      expect(TENANCY_SERVICE_METADATA_FIELD).toBe('$$MT_TENANCY_SERVICE$$');
    });
  });

  describe('TENANT_ENTITY_METADATA_FIELD', () => {
    it('should equal "$$MT_TENANT_ENTITY$$"', () => {
      expect(TENANT_ENTITY_METADATA_FIELD).toBe('$$MT_TENANT_ENTITY$$');
    });
  });

  describe('HOOK_METHOD_PREFIX', () => {
    it('should equal "$$MT$$_"', () => {
      expect(HOOK_METHOD_PREFIX).toBe('$$MT$$_');
    });
  });

  describe('TENANT_FIELD', () => {
    it('should equal "tenant"', () => {
      expect(TENANT_FIELD).toBe('tenant');
    });
  });

  describe('ID_FIELD', () => {
    it('should equal "id"', () => {
      expect(ID_FIELD).toBe('id');
    });
  });

  describe('TENANT_ENTITY_OPTIONS_METADATA_FIELD', () => {
    it('should equal "$$MT_TENANT_ENTITY_OPTIONS$$"', () => {
      expect(TENANT_ENTITY_OPTIONS_METADATA_FIELD).toBe(
        '$$MT_TENANT_ENTITY_OPTIONS$$',
      );
    });
  });

  describe('DEFAULT_ENTITY_OPTIONS', () => {
    it('should set tenantField to TENANT_FIELD', () => {
      expect(DEFAULT_ENTITY_OPTIONS.tenantField).toBe(TENANT_FIELD);
    });

    it('should set idField to ID_FIELD', () => {
      expect(DEFAULT_ENTITY_OPTIONS.idField).toBe(ID_FIELD);
    });

    it('should have tenantField equal to "tenant"', () => {
      expect(DEFAULT_ENTITY_OPTIONS.tenantField).toBe('tenant');
    });

    it('should have idField equal to "id"', () => {
      expect(DEFAULT_ENTITY_OPTIONS.idField).toBe('id');
    });

    it('should only contain tenantField and idField properties', () => {
      expect(Object.keys(DEFAULT_ENTITY_OPTIONS)).toEqual(
        expect.arrayContaining(['tenantField', 'idField']),
      );
      expect(Object.keys(DEFAULT_ENTITY_OPTIONS)).toHaveLength(2);
    });
  });
});
