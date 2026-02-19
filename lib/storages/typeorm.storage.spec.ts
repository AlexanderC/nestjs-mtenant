import { TypeOrmStorage } from './typeorm.storage';

interface TestSettings {
  plan: string;
  maxUsers: number;
}

describe('TypeOrmStorage', () => {
  let mockRepository: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let storage: TypeOrmStorage<TestSettings>;

  const tenant = 'acme';
  const settings: TestSettings = { plan: 'enterprise', maxUsers: 100 };
  const encodedSettings = JSON.stringify(settings);

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    storage = new TypeOrmStorage<TestSettings>(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('add()', () => {
    it('should call repository.create with tenant and JSON-encoded settings', async () => {
      const entity = { tenant, settings: encodedSettings };
      mockRepository.create.mockReturnValue(entity);
      mockRepository.save.mockResolvedValue({
        tenant,
        settings: encodedSettings,
      });

      await storage.add(tenant, settings);

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      expect(mockRepository.create).toHaveBeenCalledWith({
        tenant,
        settings: encodedSettings,
      });
    });

    it('should call repository.save with the entity returned by create', async () => {
      const entity = { tenant, settings: encodedSettings };
      mockRepository.create.mockReturnValue(entity);
      mockRepository.save.mockResolvedValue({
        tenant,
        settings: encodedSettings,
      });

      await storage.add(tenant, settings);

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledWith(entity);
    });

    it('should return a TenantEntity with the original (non-encoded) settings', async () => {
      mockRepository.create.mockReturnValue({
        tenant,
        settings: encodedSettings,
      });
      mockRepository.save.mockResolvedValue({
        tenant,
        settings: encodedSettings,
      });

      const result = await storage.add(tenant, settings);

      expect(result).toEqual({ tenant, settings });
    });

    it('should encode undefined settings as null', async () => {
      const entity = { tenant, settings: null };
      mockRepository.create.mockReturnValue(entity);
      mockRepository.save.mockResolvedValue({ tenant, settings: null });

      await storage.add(tenant, undefined);

      expect(mockRepository.create).toHaveBeenCalledWith({
        tenant,
        settings: null,
      });
    });
  });

  describe('remove()', () => {
    it('should call repository.delete with the correct where clause', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await storage.remove(tenant);

      expect(mockRepository.delete).toHaveBeenCalledTimes(1);
      expect(mockRepository.delete).toHaveBeenCalledWith({ tenant });
    });

    it('should return the number of affected rows', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 2 });

      const result = await storage.remove(tenant);

      expect(result).toBe(2);
    });

    it('should return 0 when affected is 0', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await storage.remove(tenant);

      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      mockRepository.delete.mockResolvedValue({});

      const result = await storage.remove(tenant);

      expect(result).toBe(0);
    });
  });

  describe('exists()', () => {
    it('should return true when count is greater than 0', async () => {
      mockRepository.count.mockResolvedValue(1);

      const result = await storage.exists(tenant);

      expect(result).toBe(true);
      expect(mockRepository.count).toHaveBeenCalledWith({ where: { tenant } });
    });

    it('should return false when count is 0', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await storage.exists(tenant);

      expect(result).toBe(false);
    });

    it('should return true when count is greater than 1', async () => {
      mockRepository.count.mockResolvedValue(3);

      const result = await storage.exists(tenant);

      expect(result).toBe(true);
    });
  });

  describe('updateSettings()', () => {
    it('should call repository.update with the tenant filter and encoded settings', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await storage.updateSettings(tenant, settings);

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).toHaveBeenCalledWith(
        { tenant },
        { settings: encodedSettings },
      );
    });

    it('should return a TenantEntity with the original (non-encoded) settings', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await storage.updateSettings(tenant, settings);

      expect(result).toEqual({ tenant, settings });
    });

    it('should encode null settings as null during update', async () => {
      mockRepository.update.mockResolvedValue({ affected: 0 });

      await storage.updateSettings(tenant, null as any);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { tenant },
        { settings: null },
      );
    });
  });

  describe('get() - all tenants', () => {
    it('should call repository.find with select clause', async () => {
      mockRepository.find.mockResolvedValue([]);

      await storage.get();

      expect(mockRepository.find).toHaveBeenCalledTimes(1);
      expect(mockRepository.find).toHaveBeenCalledWith({
        select: ['tenant', 'settings'],
      });
    });

    it('should return an array of TenantEntity objects with decoded settings', async () => {
      mockRepository.find.mockResolvedValue([
        { tenant: 'acme', settings: encodedSettings },
        {
          tenant: 'globex',
          settings: JSON.stringify({ plan: 'starter', maxUsers: 5 }),
        },
      ]);

      const result = await storage.get();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([
        { tenant: 'acme', settings },
        { tenant: 'globex', settings: { plan: 'starter', maxUsers: 5 } },
      ]);
    });

    it('should return an empty array when no tenants exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await storage.get();

      expect(result).toEqual([]);
    });

    it('should decode null settings as null for each entry', async () => {
      mockRepository.find.mockResolvedValue([
        { tenant: 'acme', settings: null },
      ]);

      const result = await storage.get();

      expect(result).toEqual([{ tenant: 'acme', settings: null }]);
    });
  });

  describe('get() - single tenant', () => {
    it('should call repository.findOne with where clause and select', async () => {
      mockRepository.findOne.mockResolvedValue({
        tenant,
        settings: encodedSettings,
      });

      await storage.get(tenant);

      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { tenant },
        select: ['tenant', 'settings'],
      });
    });

    it('should return a TenantEntity with decoded settings', async () => {
      mockRepository.findOne.mockResolvedValue({
        tenant,
        settings: encodedSettings,
      });

      const result = await storage.get(tenant);

      expect(result).toEqual({ tenant, settings });
    });

    it('should return null settings when stored settings are null', async () => {
      mockRepository.findOne.mockResolvedValue({ tenant, settings: null });

      const result = await storage.get(tenant);

      expect(result).toEqual({ tenant, settings: null });
    });

    it('should return null settings when the entry is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await storage.get(tenant);

      expect(result).toEqual({ tenant, settings: null });
    });

    it('should handle settings stored as a Buffer/non-string by calling toString()', async () => {
      const buffer = Buffer.from(encodedSettings);
      mockRepository.findOne.mockResolvedValue({ tenant, settings: buffer });

      const result = await storage.get(tenant);

      expect(result).toEqual({ tenant, settings });
    });
  });

  describe('JSON encode/decode', () => {
    it('should round-trip complex settings objects through JSON', async () => {
      const complex: TestSettings = { plan: 'custom', maxUsers: 9999 };
      const encoded = JSON.stringify(complex);

      mockRepository.create.mockReturnValue({ tenant, settings: encoded });
      mockRepository.save.mockResolvedValue({ tenant, settings: encoded });
      mockRepository.findOne.mockResolvedValue({ tenant, settings: encoded });

      await storage.add(tenant, complex);
      const retrieved = await storage.get(tenant);

      expect(retrieved).toEqual({ tenant, settings: complex });
    });
  });
});
