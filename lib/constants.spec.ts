import 'reflect-metadata';
import {
  SEQUELIZE_STORAGE,
  TYPEORM_STORAGE,
  IOREDIS_CACHE,
  MT_SCOPE_KEY,
  MT_OPTIONS,
  MT_HEADER_NAME,
  MT_QUERY_PARAMETER_NAME,
  DEFAULT_TRANSPORT,
  DEFAULT_TENANT,
  DEFAULT_SETTINGS_DTO,
  DEFAULT_OPTIONS,
} from './constants';
import { TenantTransport } from './interfaces/core.interface';

describe('constants', () => {
  describe('storage and cache identifiers', () => {
    it('should export SEQUELIZE_STORAGE as "sequelize"', () => {
      expect(SEQUELIZE_STORAGE).toBe('sequelize');
    });

    it('should export TYPEORM_STORAGE as "typeorm"', () => {
      expect(TYPEORM_STORAGE).toBe('typeorm');
    });

    it('should export IOREDIS_CACHE as "ioredis"', () => {
      expect(IOREDIS_CACHE).toBe('ioredis');
    });
  });

  describe('metadata and injection keys', () => {
    it('should export MT_SCOPE_KEY as "$$MT_SCOPE$$"', () => {
      expect(MT_SCOPE_KEY).toBe('$$MT_SCOPE$$');
    });

    it('should export MT_OPTIONS as "MT_OPTIONS"', () => {
      expect(MT_OPTIONS).toBe('MT_OPTIONS');
    });
  });

  describe('HTTP transport defaults', () => {
    it('should export MT_HEADER_NAME as "X-Tenant-ID"', () => {
      expect(MT_HEADER_NAME).toBe('X-Tenant-ID');
    });

    it('should export MT_QUERY_PARAMETER_NAME as "tenant"', () => {
      expect(MT_QUERY_PARAMETER_NAME).toBe('tenant');
    });
  });

  describe('DEFAULT_TRANSPORT', () => {
    it('should equal TenantTransport.HTTP', () => {
      expect(DEFAULT_TRANSPORT).toBe(TenantTransport.HTTP);
    });

    it('should have the value "http"', () => {
      expect(DEFAULT_TRANSPORT).toBe('http');
    });
  });

  describe('DEFAULT_TENANT', () => {
    it('should be "root"', () => {
      expect(DEFAULT_TENANT).toBe('root');
    });
  });

  describe('DEFAULT_SETTINGS_DTO', () => {
    it('should be an empty object', () => {
      expect(DEFAULT_SETTINGS_DTO).toEqual({});
    });
  });

  describe('DEFAULT_OPTIONS', () => {
    it('should set storageSettingsDto to DEFAULT_SETTINGS_DTO', () => {
      expect(DEFAULT_OPTIONS.storageSettingsDto).toBe(DEFAULT_SETTINGS_DTO);
    });

    it('should set transport to DEFAULT_TRANSPORT', () => {
      expect(DEFAULT_OPTIONS.transport).toBe(DEFAULT_TRANSPORT);
    });

    it('should set headerName to MT_HEADER_NAME', () => {
      expect(DEFAULT_OPTIONS.headerName).toBe(MT_HEADER_NAME);
    });

    it('should set queryParameterName to MT_QUERY_PARAMETER_NAME', () => {
      expect(DEFAULT_OPTIONS.queryParameterName).toBe(MT_QUERY_PARAMETER_NAME);
    });

    it('should set defaultTenant to DEFAULT_TENANT', () => {
      expect(DEFAULT_OPTIONS.defaultTenant).toBe(DEFAULT_TENANT);
    });

    it('should set allowTenant to a function that always returns true', () => {
      expect(typeof DEFAULT_OPTIONS.allowTenant).toBe('function');
      expect(DEFAULT_OPTIONS.allowTenant!({}, 'any-tenant')).toBe(true);
    });

    it('should set allowMissingTenant to true', () => {
      expect(DEFAULT_OPTIONS.allowMissingTenant).toBe(true);
    });
  });
});
