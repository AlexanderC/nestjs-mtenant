import { CachedStorage, CachedStorageOptions } from './cached.storage';
import { CacheError } from './cache/cache.error';
import { Storage, TenantEntity } from '../interfaces/storage.interface';
import { Cache } from './cache/cache.interface';

interface TestSettings {
  color: string;
}

describe('CachedStorage', () => {
  let mockStorage: jest.Mocked<Storage<TestSettings>>;
  let mockCache: jest.Mocked<Cache>;
  let cachedStorage: CachedStorage<TestSettings>;

  const tenant = 'acme';
  const settings: TestSettings = { color: 'blue' };
  const entity: TenantEntity<TestSettings> = { tenant, settings };

  const DEFAULT_PREFIX = 'MTENANT_PCACHE/';
  const existsKey = `${DEFAULT_PREFIX}${tenant}$exists`;
  const getKey = `${DEFAULT_PREFIX}${tenant}$get`;

  beforeEach(() => {
    mockStorage = {
      add: jest.fn(),
      remove: jest.fn(),
      exists: jest.fn(),
      updateSettings: jest.fn(),
      get: jest.fn(),
    };

    mockCache = {
      set: jest.fn(),
      has: jest.fn(),
      get: jest.fn(),
      remove: jest.fn(),
    };

    cachedStorage = new CachedStorage<TestSettings>(mockStorage, mockCache);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Constructor / options
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('should use DEFAULT_OPTIONS when no options are provided', () => {
      expect(cachedStorage.options).toEqual({
        expire: 3600,
        prefix: DEFAULT_PREFIX,
      });
    });

    it('should merge provided options with defaults', () => {
      const custom: CachedStorageOptions = { expire: 60 };
      const cs = new CachedStorage<TestSettings>(
        mockStorage,
        mockCache,
        custom,
      );
      expect(cs.options).toEqual({ expire: 60, prefix: DEFAULT_PREFIX });
    });

    it('should override the prefix when explicitly provided', () => {
      const custom: CachedStorageOptions = { prefix: 'MY_PREFIX/' };
      const cs = new CachedStorage<TestSettings>(
        mockStorage,
        mockCache,
        custom,
      );
      expect(cs.options!.prefix).toBe('MY_PREFIX/');
    });
  });

  // ---------------------------------------------------------------------------
  // exists()
  // ---------------------------------------------------------------------------

  describe('exists()', () => {
    it('should return cached value on cache hit without calling storage', async () => {
      mockCache.has.mockResolvedValue(true);
      mockCache.get.mockResolvedValue(JSON.stringify(true));

      const result = await cachedStorage.exists(tenant);

      expect(result).toBe(true);
      expect(mockCache.has).toHaveBeenCalledWith(existsKey);
      expect(mockCache.get).toHaveBeenCalledWith(existsKey);
      expect(mockStorage.exists).not.toHaveBeenCalled();
    });

    it('should return false from cache on a cache hit with false value', async () => {
      mockCache.has.mockResolvedValue(true);
      mockCache.get.mockResolvedValue(JSON.stringify(false));

      const result = await cachedStorage.exists(tenant);

      expect(result).toBe(false);
      expect(mockStorage.exists).not.toHaveBeenCalled();
    });

    it('should fetch from storage and populate cache on cache miss', async () => {
      mockCache.has.mockResolvedValue(false);
      mockStorage.exists.mockResolvedValue(true);
      mockCache.set.mockResolvedValue(true);

      const result = await cachedStorage.exists(tenant);

      expect(result).toBe(true);
      expect(mockStorage.exists).toHaveBeenCalledWith(tenant);
      expect(mockCache.set).toHaveBeenCalledWith(
        existsKey,
        JSON.stringify(true),
        3600,
      );
    });

    it('should throw CacheError when cache.set fails on exists cache miss', async () => {
      mockCache.has.mockResolvedValue(false);
      mockStorage.exists.mockResolvedValue(true);
      mockCache.set.mockResolvedValue(false);

      await expect(cachedStorage.exists(tenant)).rejects.toBeInstanceOf(
        CacheError,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // get()
  // ---------------------------------------------------------------------------

  describe('get()', () => {
    it('should return cached value on cache hit without calling storage', async () => {
      mockCache.has.mockResolvedValue(true);
      mockCache.get.mockResolvedValue(JSON.stringify(entity));

      const result = await cachedStorage.get(tenant);

      expect(result).toEqual(entity);
      expect(mockCache.has).toHaveBeenCalledWith(getKey);
      expect(mockCache.get).toHaveBeenCalledWith(getKey);
      expect(mockStorage.get).not.toHaveBeenCalled();
    });

    it('should fetch from storage and populate cache on cache miss', async () => {
      mockCache.has.mockResolvedValue(false);
      mockStorage.get.mockResolvedValue(entity);
      mockCache.set.mockResolvedValue(true);

      const result = await cachedStorage.get(tenant);

      expect(result).toEqual(entity);
      expect(mockStorage.get).toHaveBeenCalledWith(tenant);
      expect(mockCache.set).toHaveBeenCalledWith(
        getKey,
        JSON.stringify(entity),
        3600,
      );
    });

    it('should throw CacheError when cache.set fails on get cache miss', async () => {
      mockCache.has.mockResolvedValue(false);
      mockStorage.get.mockResolvedValue(entity);
      mockCache.set.mockResolvedValue(false);

      await expect(cachedStorage.get(tenant)).rejects.toBeInstanceOf(
        CacheError,
      );
    });

    it('should use a key without tenant segment when tenant is undefined', async () => {
      const noTenantKey = `${DEFAULT_PREFIX}undefined$get`;
      const allEntities = [entity];

      mockCache.has.mockResolvedValue(false);
      mockStorage.get.mockResolvedValue(allEntities);
      mockCache.set.mockResolvedValue(true);

      await cachedStorage.get(undefined);

      expect(mockCache.has).toHaveBeenCalledWith(noTenantKey);
      expect(mockStorage.get).toHaveBeenCalledWith(undefined);
    });

    it('should return cached array of all tenants on cache hit', async () => {
      const allEntities = [
        entity,
        { tenant: 'globex', settings: { color: 'red' } },
      ];
      const noTenantKey = `${DEFAULT_PREFIX}undefined$get`;

      mockCache.has.mockResolvedValue(true);
      mockCache.get.mockResolvedValue(JSON.stringify(allEntities));

      const result = await cachedStorage.get(undefined);

      expect(result).toEqual(allEntities);
      expect(mockCache.has).toHaveBeenCalledWith(noTenantKey);
    });
  });

  // ---------------------------------------------------------------------------
  // add()
  // ---------------------------------------------------------------------------

  describe('add()', () => {
    it('should purge cache for both EXISTS and GET ops before delegating to storage', async () => {
      mockCache.has.mockResolvedValue(true);
      mockCache.remove.mockResolvedValue(true);
      mockStorage.add.mockResolvedValue(entity);

      await cachedStorage.add(tenant, settings);

      expect(mockCache.has).toHaveBeenCalledWith(getKey);
      expect(mockCache.has).toHaveBeenCalledWith(existsKey);
      expect(mockCache.remove).toHaveBeenCalledWith(getKey);
      expect(mockCache.remove).toHaveBeenCalledWith(existsKey);
      expect(mockStorage.add).toHaveBeenCalledWith(tenant, settings);
    });

    it('should return the result from the underlying storage', async () => {
      mockCache.has.mockResolvedValue(false);
      mockStorage.add.mockResolvedValue(entity);

      const result = await cachedStorage.add(tenant, settings);

      expect(result).toEqual(entity);
    });

    it('should not call cache.remove when the cache has no entry for the tenant', async () => {
      mockCache.has.mockResolvedValue(false);
      mockStorage.add.mockResolvedValue(entity);

      await cachedStorage.add(tenant, settings);

      expect(mockCache.remove).not.toHaveBeenCalled();
    });

    it('should throw CacheError when cache.remove fails during purge in add()', async () => {
      mockCache.has.mockResolvedValue(true);
      mockCache.remove.mockResolvedValue(false);
      mockStorage.add.mockResolvedValue(entity);

      await expect(cachedStorage.add(tenant, settings)).rejects.toBeInstanceOf(
        CacheError,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // remove()
  // ---------------------------------------------------------------------------

  describe('remove()', () => {
    it('should purge cache for both ops before delegating to storage', async () => {
      mockCache.has.mockResolvedValue(true);
      mockCache.remove.mockResolvedValue(true);
      mockStorage.remove.mockResolvedValue(1);

      await cachedStorage.remove(tenant);

      expect(mockCache.remove).toHaveBeenCalledWith(getKey);
      expect(mockCache.remove).toHaveBeenCalledWith(existsKey);
      expect(mockStorage.remove).toHaveBeenCalledWith(tenant);
    });

    it('should return the number of removed rows from the underlying storage', async () => {
      mockCache.has.mockResolvedValue(false);
      mockStorage.remove.mockResolvedValue(1);

      const result = await cachedStorage.remove(tenant);

      expect(result).toBe(1);
    });

    it('should throw CacheError when cache.remove fails during purge in remove()', async () => {
      mockCache.has.mockResolvedValue(true);
      mockCache.remove.mockResolvedValue(false);

      await expect(cachedStorage.remove(tenant)).rejects.toBeInstanceOf(
        CacheError,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // updateSettings()
  // ---------------------------------------------------------------------------

  describe('updateSettings()', () => {
    it('should purge only the GET cache key (not EXISTS) before delegating to storage', async () => {
      mockCache.has.mockResolvedValue(true);
      mockCache.remove.mockResolvedValue(true);
      mockStorage.updateSettings.mockResolvedValue(entity);

      await cachedStorage.updateSettings(tenant, settings);

      // GET key must be purged
      expect(mockCache.has).toHaveBeenCalledWith(getKey);
      expect(mockCache.remove).toHaveBeenCalledWith(getKey);

      // EXISTS key must NOT be purged
      expect(mockCache.has).not.toHaveBeenCalledWith(existsKey);
      expect(mockCache.remove).not.toHaveBeenCalledWith(existsKey);
    });

    it('should delegate to storage and return its result', async () => {
      mockCache.has.mockResolvedValue(false);
      mockStorage.updateSettings.mockResolvedValue(entity);

      const result = await cachedStorage.updateSettings(tenant, settings);

      expect(mockStorage.updateSettings).toHaveBeenCalledWith(tenant, settings);
      expect(result).toEqual(entity);
    });
  });

  // ---------------------------------------------------------------------------
  // Key generation
  // ---------------------------------------------------------------------------

  describe('key generation', () => {
    it('should generate keys using the configured prefix', async () => {
      const customPrefix = 'CUSTOM/';
      const cs = new CachedStorage<TestSettings>(mockStorage, mockCache, {
        prefix: customPrefix,
      });

      mockCache.has.mockResolvedValue(false);
      mockStorage.exists.mockResolvedValue(true);
      mockCache.set.mockResolvedValue(true);

      await cs.exists(tenant);

      expect(mockCache.has).toHaveBeenCalledWith(
        `${customPrefix}${tenant}$exists`,
      );
    });

    it('should generate separate keys for exists and get operations', async () => {
      mockCache.has.mockResolvedValue(false);
      mockStorage.exists.mockResolvedValue(true);
      mockStorage.get.mockResolvedValue(entity);
      mockCache.set.mockResolvedValue(true);

      await cachedStorage.exists(tenant);
      await cachedStorage.get(tenant);

      const hasCallArgs = (mockCache.has as jest.Mock).mock.calls.map(
        (c) => c[0],
      );
      expect(hasCallArgs).toContain(existsKey);
      expect(hasCallArgs).toContain(getKey);
      expect(existsKey).not.toBe(getKey);
    });
  });
});
