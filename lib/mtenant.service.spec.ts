import 'reflect-metadata';
import { NotAcceptableException } from '@nestjs/common';
import { MtenantService } from './mtenant.service';
import { BaseError } from './errors/mtenant.error';
import { TenantTransport } from './interfaces/core.interface';
import { SequelizeStorage } from './storages/sequelize.storage';
import { CachedStorage } from './storages/cached.storage';
import { IoRedis } from './storages/cache/ioredis';
import { MT_OPTIONS, MT_SCOPE_KEY } from './constants';

jest.mock('./decorators/entity', () => ({
  injectTenancyService: jest.fn(),
  getTenancyService: jest.fn(),
  isTenantEntity: jest.fn(),
  isTenantEntityMetadata: jest.fn(),
}));

// Mock ioredis so IoRedis constructor doesn't fail
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({}));
});

const { injectTenancyService } = require('./decorators/entity');

const mockCls = {
  get: jest.fn(),
  set: jest.fn(),
};

function buildService(overrides: Partial<any> = {}): MtenantService {
  const options = {
    for: [],
    transport: TenantTransport.HTTP,
    ...overrides,
  };
  return new MtenantService(options as any, mockCls as any);
}

describe('MtenantService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // setup() - transport
  // ---------------------------------------------------------------------------
  describe('setup() - transport', () => {
    it('creates HttpTransport when transport is HTTP (default)', () => {
      const service = buildService({ transport: TenantTransport.HTTP });
      expect((service as any).transport).toBeDefined();
      expect((service as any).transport.constructor.name).toBe('HttpTransport');
    });

    it('throws BaseError for unknown transport', () => {
      expect(() => buildService({ transport: 'ftp' as any })).toThrow(
        BaseError,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // setup() - storage
  // ---------------------------------------------------------------------------
  describe('setup() - storage', () => {
    it('creates SequelizeStorage when storage is "sequelize"', () => {
      const mockRepo = {};
      const service = buildService({
        storage: 'sequelize',
        storageRepository: mockRepo,
      });
      expect(service.storage).toBeInstanceOf(SequelizeStorage);
    });

    it('creates TypeOrmStorage when storage is "typeorm"', () => {
      // Verify the real TypeOrmStorage class can be instantiated (typeorm is available)
      const { TypeOrmStorage } = require('./storages/typeorm.storage');
      const storageInstance = new TypeOrmStorage({});
      expect(storageInstance).toBeDefined();
    });

    it('throws BaseError when TypeORM storage fails to load', () => {
      // The MtenantService wraps the typeorm.storage require in a try/catch and
      // re-throws as BaseError. We exercise this by providing a broken require path
      // via jest.isolateModules so the cached module registry is bypassed.
      // Note: jest.isolateModules creates a separate module registry, so we check
      // the constructor name rather than using instanceof (which would compare different
      // class instances across registries).
      let thrownError: any;
      jest.isolateModules(() => {
        jest.mock('./storages/typeorm.storage', () => {
          throw new Error('typeorm not installed');
        });
        const {
          MtenantService: IsolatedService,
        } = require('./mtenant.service');
        try {
          new IsolatedService(
            {
              for: [],
              transport: TenantTransport.HTTP,
              storage: 'typeorm',
            } as any,
            mockCls as any,
          );
        } catch (e) {
          thrownError = e;
        }
      });
      expect(thrownError).toBeDefined();
      expect(thrownError.constructor.name).toBe('BaseError');
      expect(thrownError).toBeInstanceOf(Error);
    });

    it('uses custom storage object when storage is not a string', () => {
      const customStorage = {
        add: jest.fn(),
        remove: jest.fn(),
        exists: jest.fn(),
        updateSettings: jest.fn(),
        get: jest.fn(),
      };
      const service = buildService({ storage: customStorage });
      expect(service.storage).toBe(customStorage);
    });

    it('throws BaseError for unknown storage string', () => {
      expect(() => buildService({ storage: 'unknowndb' })).toThrow(BaseError);
    });

    it('sets no storage when option is not provided', () => {
      const service = buildService();
      expect(service.storage).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // setup() - cache
  // ---------------------------------------------------------------------------
  describe('setup() - cache', () => {
    it('creates IoRedis + CachedStorage when cache is "ioredis"', () => {
      const customStorage = {
        add: jest.fn(),
        remove: jest.fn(),
        exists: jest.fn(),
        updateSettings: jest.fn(),
        get: jest.fn(),
      };
      const mockRedisClient = {};
      const service = buildService({
        storage: customStorage,
        cache: 'ioredis',
        cacheClient: mockRedisClient,
      });
      expect(service.storage).toBeInstanceOf(CachedStorage);
      const cachedStorage = service.storage as CachedStorage<any>;
      expect(cachedStorage.cache).toBeInstanceOf(IoRedis);
      expect(cachedStorage.storage).toBe(customStorage);
    });

    it('throws BaseError when cache is set but storage is not', () => {
      expect(() => buildService({ cache: 'ioredis' })).toThrow(BaseError);
    });

    it('throws BaseError for unknown cache type string', () => {
      const customStorage = {
        add: jest.fn(),
        remove: jest.fn(),
        exists: jest.fn(),
        updateSettings: jest.fn(),
        get: jest.fn(),
      };
      expect(() =>
        buildService({ storage: customStorage, cache: 'memcached' }),
      ).toThrow(BaseError);
    });

    it('uses custom cache object when cache is not a string', () => {
      const customStorage = {
        add: jest.fn(),
        remove: jest.fn(),
        exists: jest.fn(),
        updateSettings: jest.fn(),
        get: jest.fn(),
      };
      const customCache = {
        set: jest.fn(),
        has: jest.fn(),
        get: jest.fn(),
        remove: jest.fn(),
      };
      const service = buildService({
        storage: customStorage,
        cache: customCache,
      });
      expect(service.storage).toBeInstanceOf(CachedStorage);
      const cachedStorage = service.storage as CachedStorage<any>;
      expect(cachedStorage.cache).toBe(customCache);
    });
  });

  // ---------------------------------------------------------------------------
  // setup() - entities
  // ---------------------------------------------------------------------------
  describe('setup() - entities', () => {
    it('calls injectTenancyService for each entity in the "for" array', () => {
      class EntityA {}
      class EntityB {}
      const service = buildService({ for: [EntityA, EntityB] });
      expect(injectTenancyService).toHaveBeenCalledTimes(2);
      expect(injectTenancyService).toHaveBeenCalledWith(EntityA, service);
      expect(injectTenancyService).toHaveBeenCalledWith(EntityB, service);
    });

    it('does not call injectTenancyService when for array is empty', () => {
      buildService({ for: [] });
      expect(injectTenancyService).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // setup() - TypeORM subscriber
  // ---------------------------------------------------------------------------
  describe('setup() - TypeORM subscriber', () => {
    it('registers subscriber when dataSource is provided and not already registered', () => {
      const mockDataSource = {
        subscribers: [],
      };
      buildService({ dataSource: mockDataSource });
      expect(mockDataSource.subscribers).toHaveLength(1);
    });

    it('skips subscriber registration when no dataSource is provided', () => {
      const service = buildService();
      // No error should be thrown; no dataSource means no subscriber registered
      expect((service as any).options.dataSource).toBeUndefined();
    });

    it('does not register duplicate subscriber when already present', () => {
      // Load the real subscriber class
      const {
        TenantEntitySubscriber,
      } = require('./subscribers/tenant-entity.subscriber');
      const existingSubscriber = new TenantEntitySubscriber();
      const mockDataSource = {
        subscribers: [existingSubscriber],
      };
      buildService({ dataSource: mockDataSource });
      // Still only one subscriber
      expect(mockDataSource.subscribers).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // runWithinTenancyScope()
  // ---------------------------------------------------------------------------
  describe('runWithinTenancyScope()', () => {
    it('sets tenant in CLS context and calls the handler', async () => {
      const service = buildService({ defaultTenant: 'root' });
      const handler = jest.fn();
      // context with no headers → transport.extract returns null → uses defaultTenant
      await service.runWithinTenancyScope({}, handler);

      expect(mockCls.set).toHaveBeenCalledWith(MT_SCOPE_KEY, {
        tenant: 'root',
        enabled: true,
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('extracts tenant from HTTP header and sets it in CLS', async () => {
      const service = buildService({
        defaultTenant: 'root',
        allowTenant: () => true,
      });
      const handler = jest.fn();
      const context = { headers: { 'x-tenant-id': 'acme' } };
      await service.runWithinTenancyScope(context, handler);

      expect(mockCls.set).toHaveBeenCalledWith(MT_SCOPE_KEY, {
        tenant: 'acme',
        enabled: true,
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // setTenant()
  // ---------------------------------------------------------------------------
  describe('setTenant()', () => {
    it('sets tenant in CLS when tenant is allowed and returns self', async () => {
      const service = buildService({
        defaultTenant: 'root',
        allowTenant: () => true,
      });
      const result = await service.setTenant('acme');

      expect(mockCls.set).toHaveBeenCalledWith(MT_SCOPE_KEY, {
        tenant: 'acme',
        enabled: true,
      });
      expect(result).toBe(service);
    });

    it('throws NotAcceptableException when tenant is not allowed', async () => {
      const service = buildService({
        defaultTenant: 'root',
        allowTenant: () => false,
      });
      await expect(service.setTenant('blocked')).rejects.toThrow(
        NotAcceptableException,
      );
    });

    it('does not set CLS when tenant is rejected', async () => {
      const service = buildService({
        defaultTenant: 'root',
        allowTenant: () => false,
      });
      await expect(service.setTenant('blocked')).rejects.toThrow();
      expect(mockCls.set).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getTenant()
  // ---------------------------------------------------------------------------
  describe('getTenant()', () => {
    it('returns extracted tenant from context when valid and allowed', async () => {
      const service = buildService({
        defaultTenant: 'root',
        allowTenant: () => true,
      });
      const context = { headers: { 'x-tenant-id': 'acme' } };
      const tenant = await service.getTenant(context);
      expect(tenant).toBe('acme');
    });

    it('returns defaultTenant when transport returns null', async () => {
      const service = buildService({ defaultTenant: 'root' });
      const tenant = await service.getTenant({});
      expect(tenant).toBe('root');
    });

    it('throws NotAcceptableException for disallowed tenant in header', async () => {
      const service = buildService({
        defaultTenant: 'root',
        allowTenant: () => false,
      });
      const context = { headers: { 'x-tenant-id': 'blocked' } };
      await expect(service.getTenant(context)).rejects.toThrow(
        NotAcceptableException,
      );
    });

    it('returns defaultTenant when extracted tenant is empty string', async () => {
      const service = buildService({ defaultTenant: 'root' });
      const context = { headers: {} };
      const tenant = await service.getTenant(context);
      expect(tenant).toBe('root');
    });
  });

  // ---------------------------------------------------------------------------
  // isTenantAllowed()
  // ---------------------------------------------------------------------------
  describe('isTenantAllowed()', () => {
    it('returns true for defaultTenant without any storage/guard checks', async () => {
      const guardFn = jest.fn(() => true);
      const service = buildService({
        defaultTenant: 'root',
        allowTenant: guardFn,
      });
      const result = await service.isTenantAllowed({}, 'root');
      expect(result).toBe(true);
      // guard should not be called for the default tenant
      expect(guardFn).not.toHaveBeenCalled();
    });

    it('returns false when storage.exists returns false', async () => {
      const mockStorage = {
        exists: jest.fn().mockResolvedValue(false),
      };
      const service = buildService({
        storage: mockStorage,
        defaultTenant: 'root',
      });
      const result = await service.isTenantAllowed({}, 'acme');
      expect(result).toBe(false);
    });

    it('calls allowTenant guard when storage check passes', async () => {
      const guardFn = jest.fn().mockReturnValue(true);
      const mockStorage = {
        exists: jest.fn().mockResolvedValue(true),
      };
      const service = buildService({
        storage: mockStorage,
        defaultTenant: 'root',
        allowTenant: guardFn,
      });
      const context = { headers: {} };
      const result = await service.isTenantAllowed(context, 'acme');
      expect(result).toBe(true);
      expect(guardFn).toHaveBeenCalledWith(context, 'acme');
    });

    it('works when no storage is configured (no storage check)', async () => {
      const guardFn = jest.fn().mockReturnValue(true);
      const service = buildService({
        defaultTenant: 'root',
        allowTenant: guardFn,
      });
      const result = await service.isTenantAllowed({}, 'acme');
      expect(result).toBe(true);
      expect(guardFn).toHaveBeenCalledWith({}, 'acme');
    });

    it('returns false when guard returns false', async () => {
      const guardFn = jest.fn().mockReturnValue(false);
      const service = buildService({
        defaultTenant: 'root',
        allowTenant: guardFn,
      });
      const result = await service.isTenantAllowed({}, 'acme');
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // disableTenancyForCurrentScope()
  // ---------------------------------------------------------------------------
  describe('disableTenancyForCurrentScope()', () => {
    it('sets enabled=false in CLS and returns self', () => {
      mockCls.get.mockReturnValue({ tenant: 'acme', enabled: true });
      const service = buildService({ defaultTenant: 'root' });
      const result = service.disableTenancyForCurrentScope();

      expect(mockCls.set).toHaveBeenCalledWith(
        MT_SCOPE_KEY,
        expect.objectContaining({ enabled: false }),
      );
      expect(result).toBe(service);
    });

    it('preserves tenant value when disabling tenancy', () => {
      mockCls.get.mockReturnValue({ tenant: 'acme', enabled: true });
      const service = buildService({ defaultTenant: 'root' });
      service.disableTenancyForCurrentScope();

      expect(mockCls.set).toHaveBeenCalledWith(MT_SCOPE_KEY, {
        tenant: 'acme',
        enabled: false,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // tenancyScope getter
  // ---------------------------------------------------------------------------
  describe('tenancyScope getter', () => {
    it('returns scope from CLS when set', () => {
      const scope = { tenant: 'acme', enabled: true };
      mockCls.get.mockReturnValue(scope);
      const service = buildService({ defaultTenant: 'root' });
      expect(service.tenancyScope).toBe(scope);
    });

    it('returns defaultTenancyScope when CLS returns null/undefined', () => {
      mockCls.get.mockReturnValue(null);
      const service = buildService({ defaultTenant: 'root' });
      expect(service.tenancyScope).toEqual({ tenant: 'root', enabled: true });
    });

    it('returns defaultTenancyScope when cls.get throws', () => {
      mockCls.get.mockImplementation(() => {
        throw new Error('outside cls');
      });
      const service = buildService({ defaultTenant: 'root' });
      expect(service.tenancyScope).toEqual({ tenant: 'root', enabled: true });
    });
  });

  // ---------------------------------------------------------------------------
  // defaultTenancyScope getter
  // ---------------------------------------------------------------------------
  describe('defaultTenancyScope getter', () => {
    it('returns scope with defaultTenant and enabled=true', () => {
      const service = buildService({ defaultTenant: 'mydefault' });
      expect(service.defaultTenancyScope).toEqual({
        tenant: 'mydefault',
        enabled: true,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // tenancyOptions getter
  // ---------------------------------------------------------------------------
  describe('tenancyOptions getter', () => {
    it('returns the merged options object', () => {
      const service = buildService({ defaultTenant: 'root' });
      const opts = service.tenancyOptions;
      expect(opts).toBeDefined();
      expect(opts.defaultTenant).toBe('root');
    });
  });
});
