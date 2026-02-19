import { IoRedis } from './ioredis';

// Minimal shape of the Redis client methods used by IoRedis
type MockRedisClient = {
  set: jest.Mock;
  exists: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
};

describe('IoRedis', () => {
  let mockClient: MockRedisClient;
  let ioRedis: IoRedis;

  const key = 'MTENANT_PCACHE/acme$exists';
  const value = 'true';

  beforeEach(() => {
    mockClient = {
      set: jest.fn(),
      exists: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };
    // Cast to `any` to satisfy the Redis type; we only care about the mock methods.
    ioRedis = new IoRedis(mockClient as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // set()
  // ---------------------------------------------------------------------------

  describe('set()', () => {
    it('should call client.set with key and value only when expire is not provided', async () => {
      mockClient.set.mockResolvedValue('OK');

      const result = await ioRedis.set(key, value);

      expect(mockClient.set).toHaveBeenCalledTimes(1);
      expect(mockClient.set).toHaveBeenCalledWith(key, value);
      expect(result).toBe(true);
    });

    it('should call client.set with key, value, EX and expire when expire is provided', async () => {
      mockClient.set.mockResolvedValue('OK');

      const result = await ioRedis.set(key, value, 3600);

      expect(mockClient.set).toHaveBeenCalledTimes(1);
      expect(mockClient.set).toHaveBeenCalledWith(key, value, 'EX', 3600);
      expect(result).toBe(true);
    });

    it('should return false when client.set returns a non-OK response (no expire)', async () => {
      mockClient.set.mockResolvedValue(null);

      const result = await ioRedis.set(key, value);

      expect(result).toBe(false);
    });

    it('should return false when client.set returns a non-OK response (with expire)', async () => {
      mockClient.set.mockResolvedValue('ERR');

      const result = await ioRedis.set(key, value, 60);

      expect(result).toBe(false);
    });

    it('should use expire=0 as falsy and omit the EX argument', async () => {
      mockClient.set.mockResolvedValue('OK');

      await ioRedis.set(key, value, 0);

      // expire=0 is falsy, so the two-argument form should be used
      expect(mockClient.set).toHaveBeenCalledWith(key, value);
    });
  });

  // ---------------------------------------------------------------------------
  // has()
  // ---------------------------------------------------------------------------

  describe('has()', () => {
    it('should return true when client.exists returns 1', async () => {
      mockClient.exists.mockResolvedValue(1);

      const result = await ioRedis.has(key);

      expect(result).toBe(true);
      expect(mockClient.exists).toHaveBeenCalledWith(key);
    });

    it('should return false when client.exists returns 0', async () => {
      mockClient.exists.mockResolvedValue(0);

      const result = await ioRedis.has(key);

      expect(result).toBe(false);
    });

    it('should return false when client.exists returns a value other than 1', async () => {
      mockClient.exists.mockResolvedValue(2);

      const result = await ioRedis.has(key);

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // get()
  // ---------------------------------------------------------------------------

  describe('get()', () => {
    it('should return the value stored at the key', async () => {
      mockClient.get.mockResolvedValue(value);

      const result = await ioRedis.get(key);

      expect(result).toBe(value);
      expect(mockClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null when the key does not exist', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await ioRedis.get(key);

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // remove()
  // ---------------------------------------------------------------------------

  describe('remove()', () => {
    it('should return true when client.del returns 1 (key existed and was deleted)', async () => {
      mockClient.del.mockResolvedValue(1);

      const result = await ioRedis.remove(key);

      expect(result).toBe(true);
      expect(mockClient.del).toHaveBeenCalledWith(key);
    });

    it('should return false when client.del returns 0 (key did not exist)', async () => {
      mockClient.del.mockResolvedValue(0);

      const result = await ioRedis.remove(key);

      expect(result).toBe(false);
    });

    it('should return false when client.del returns a value other than 1', async () => {
      mockClient.del.mockResolvedValue(2);

      const result = await ioRedis.remove(key);

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // client property
  // ---------------------------------------------------------------------------

  describe('client property', () => {
    it('should expose the underlying Redis client as a public property', () => {
      expect(ioRedis.client).toBe(mockClient);
    });
  });
});
