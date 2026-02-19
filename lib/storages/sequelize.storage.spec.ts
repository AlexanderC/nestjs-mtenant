import { SequelizeStorage } from './sequelize.storage';

interface TestSettings {
  theme: string;
  locale: string;
}

describe('SequelizeStorage', () => {
  let mockRepository: {
    create: jest.Mock;
    destroy: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
  };
  let storage: SequelizeStorage<TestSettings>;

  const tenant = 'acme';
  const settings: TestSettings = { theme: 'dark', locale: 'en' };
  const encodedSettings = JSON.stringify(settings);

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      destroy: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };
    storage = new SequelizeStorage<TestSettings>(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('add()', () => {
    it('should call repository.create with tenant and JSON-encoded settings', async () => {
      mockRepository.create.mockResolvedValue({
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

    it('should return the raw value returned by repository.create', async () => {
      const created = { tenant, settings: encodedSettings };
      mockRepository.create.mockResolvedValue(created);

      const result = await storage.add(tenant, settings);

      expect(result).toBe(created);
    });

    it('should encode null settings as null', async () => {
      mockRepository.create.mockResolvedValue({ tenant, settings: null });

      await storage.add(tenant, undefined);

      expect(mockRepository.create).toHaveBeenCalledWith({
        tenant,
        settings: null,
      });
    });
  });

  describe('remove()', () => {
    it('should call repository.destroy with correct where clause', async () => {
      mockRepository.destroy.mockResolvedValue(1);

      await storage.remove(tenant);

      expect(mockRepository.destroy).toHaveBeenCalledTimes(1);
      expect(mockRepository.destroy).toHaveBeenCalledWith({
        where: { tenant },
      });
    });

    it('should return the number of destroyed rows', async () => {
      mockRepository.destroy.mockResolvedValue(3);

      const result = await storage.remove(tenant);

      expect(result).toBe(3);
    });

    it('should return 0 when no rows are destroyed', async () => {
      mockRepository.destroy.mockResolvedValue(0);

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
      mockRepository.count.mockResolvedValue(5);

      const result = await storage.exists(tenant);

      expect(result).toBe(true);
    });
  });

  describe('updateSettings()', () => {
    it('should call repository.update with encoded settings and where clause', async () => {
      mockRepository.update.mockResolvedValue([1]);

      await storage.updateSettings(tenant, settings);

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(mockRepository.update).toHaveBeenCalledWith(
        { settings: encodedSettings },
        { where: { tenant } },
      );
    });

    it('should return a TenantEntity with the original (non-encoded) settings', async () => {
      mockRepository.update.mockResolvedValue([1]);

      const result = await storage.updateSettings(tenant, settings);

      expect(result).toEqual({ tenant, settings });
    });

    it('should encode null settings as null during update', async () => {
      mockRepository.update.mockResolvedValue([0]);

      await storage.updateSettings(tenant, null as any);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { settings: null },
        { where: { tenant } },
      );
    });
  });

  describe('get() - all tenants', () => {
    it('should call repository.findAll with tenant and settings attributes', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      await storage.get();

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        attributes: ['tenant', 'settings'],
      });
    });

    it('should return an array of TenantEntity objects with decoded settings', async () => {
      mockRepository.findAll.mockResolvedValue([
        { tenant: 'acme', settings: encodedSettings },
        {
          tenant: 'globex',
          settings: JSON.stringify({ theme: 'light', locale: 'fr' }),
        },
      ]);

      const result = await storage.get();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([
        { tenant: 'acme', settings },
        { tenant: 'globex', settings: { theme: 'light', locale: 'fr' } },
      ]);
    });

    it('should return an empty array when no tenants exist', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await storage.get();

      expect(result).toEqual([]);
    });

    it('should decode null settings as null for each entry', async () => {
      mockRepository.findAll.mockResolvedValue([
        { tenant: 'acme', settings: null },
      ]);

      const result = await storage.get();

      expect(result).toEqual([{ tenant: 'acme', settings: null }]);
    });
  });

  describe('get() - single tenant', () => {
    it('should call repository.findOne with correct where clause and attributes', async () => {
      mockRepository.findOne.mockResolvedValue({ settings: encodedSettings });

      await storage.get(tenant);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { tenant },
        attributes: ['settings'],
      });
    });

    it('should return a TenantEntity with decoded settings', async () => {
      mockRepository.findOne.mockResolvedValue({ settings: encodedSettings });

      const result = await storage.get(tenant);

      expect(result).toEqual({ tenant, settings });
    });

    it('should return null settings when stored settings are null', async () => {
      mockRepository.findOne.mockResolvedValue({ settings: null });

      const result = await storage.get(tenant);

      expect(result).toEqual({ tenant, settings: null });
    });

    it('should handle settings stored as a Buffer/non-string by calling toString()', async () => {
      const buffer = Buffer.from(encodedSettings);
      mockRepository.findOne.mockResolvedValue({ settings: buffer });

      const result = await storage.get(tenant);

      expect(result).toEqual({ tenant, settings });
    });
  });

  describe('JSON encode/decode', () => {
    it('should round-trip complex settings objects through JSON', async () => {
      const complex: TestSettings = { theme: 'high-contrast', locale: 'zh-TW' };
      mockRepository.create.mockResolvedValue({
        tenant,
        settings: JSON.stringify(complex),
      });
      mockRepository.findOne.mockResolvedValue({
        settings: JSON.stringify(complex),
      });

      await storage.add(tenant, complex);
      const retrieved = await storage.get(tenant);

      expect(retrieved).toEqual({ tenant, settings: complex });
    });
  });
});
