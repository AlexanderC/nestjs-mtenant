import 'reflect-metadata';
import { TenantBaseRepository } from './tenant-base.repository';
import { TENANT_ENTITY_OPTIONS_METADATA_FIELD } from '../decorators/constants';

jest.mock('../decorators/entity', () => ({
  getTenancyService: jest.fn(),
  injectTenancyService: jest.fn(),
  isTenantEntity: jest.fn(),
  isTenantEntityMetadata: jest.fn(),
}));

import { getTenancyService } from '../decorators/entity';

const mockGetTenancyService = getTenancyService as jest.Mock;

class TestEntity {}

// ------------------------------------------------------------------
// Shared mock repository
// ------------------------------------------------------------------
const mockQb = {
  andWhere: jest.fn().mockReturnThis(),
};

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  findBy: jest.fn(),
  findOneBy: jest.fn(),
  count: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  softRemove: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQb),
  metadata: { target: TestEntity },
};

const mockDataSource = {
  getRepository: jest.fn().mockReturnValue(mockRepository),
};

// ------------------------------------------------------------------
// Helper: build a repository with a fully-enabled tenancy service
// ------------------------------------------------------------------
function buildMockService(
  overrides: Partial<{
    enabled: boolean;
    tenant: string;
    allowMissingTenant: boolean;
  }> = {},
) {
  const {
    enabled = true,
    tenant = 'acme',
    allowMissingTenant = false,
  } = overrides;
  return {
    tenancyScope: { enabled, tenant },
    tenancyOptions: { allowMissingTenant },
  };
}

function buildRepo(
  serviceOverrides?: Parameters<typeof buildMockService>[0],
): TenantBaseRepository<TestEntity> {
  mockGetTenancyService.mockReturnValue(buildMockService(serviceOverrides));
  return new TenantBaseRepository<TestEntity>(TestEntity, mockDataSource);
}

describe('TenantBaseRepository', () => {
  beforeAll(() => {
    // Register tenancy options metadata on TestEntity
    Reflect.defineMetadata(
      TENANT_ENTITY_OPTIONS_METADATA_FIELD,
      { tenantField: 'tenant', idField: 'id' },
      TestEntity,
    );
  });

  afterAll(() => {
    Reflect.deleteMetadata(TENANT_ENTITY_OPTIONS_METADATA_FIELD, TestEntity);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDataSource.getRepository.mockReturnValue(mockRepository);
    // Reset query builder mock
    mockQb.andWhere.mockClear();
    mockRepository.createQueryBuilder.mockReturnValue(mockQb);
  });

  // ---------------------------------------------------------------------------
  // rawRepository
  // ---------------------------------------------------------------------------
  describe('rawRepository getter', () => {
    it('returns the underlying TypeORM repository', () => {
      const repo = buildRepo();
      expect(repo.rawRepository).toBe(mockRepository);
    });
  });

  // ---------------------------------------------------------------------------
  // find()
  // ---------------------------------------------------------------------------
  describe('find()', () => {
    it('injects tenant WHERE clause when no options provided', async () => {
      mockRepository.find.mockResolvedValue([]);
      const repo = buildRepo({ tenant: 'acme' });
      await repo.find();

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenant: 'acme' } }),
      );
    });

    it('merges tenant into existing where clause', async () => {
      mockRepository.find.mockResolvedValue([]);
      const repo = buildRepo({ tenant: 'acme' });
      await repo.find({ where: { name: 'foo' } });

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: 'foo', tenant: 'acme' } }),
      );
    });

    it('produces an array where condition when allowMissingTenant is true', async () => {
      mockRepository.find.mockResolvedValue([]);
      const repo = buildRepo({ tenant: 'acme', allowMissingTenant: true });
      await repo.find({ where: { name: 'foo' } });

      const calledWith = mockRepository.find.mock.calls[0][0];
      expect(Array.isArray(calledWith.where)).toBe(true);
      expect(calledWith.where).toHaveLength(2);
      expect(calledWith.where[0]).toEqual({ name: 'foo', tenant: 'acme' });
      expect(calledWith.where[1]).toEqual({ name: 'foo', tenant: null });
    });

    it('preserves other options (order, take, skip) alongside injected where', async () => {
      mockRepository.find.mockResolvedValue([]);
      const repo = buildRepo({ tenant: 'acme' });
      await repo.find({ order: { id: 'ASC' }, take: 10 });

      const calledWith = mockRepository.find.mock.calls[0][0];
      expect(calledWith.order).toEqual({ id: 'ASC' });
      expect(calledWith.take).toBe(10);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne()
  // ---------------------------------------------------------------------------
  describe('findOne()', () => {
    it('injects tenant WHERE clause', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const repo = buildRepo({ tenant: 'acme' });
      await repo.findOne({ where: { id: 1 } });

      expect(mockRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, tenant: 'acme' } }),
      );
    });

    it('produces array where when allowMissingTenant is true', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const repo = buildRepo({ tenant: 'acme', allowMissingTenant: true });
      await repo.findOne({ where: { id: 1 } });

      const calledWith = mockRepository.findOne.mock.calls[0][0];
      expect(Array.isArray(calledWith.where)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findAndCount()
  // ---------------------------------------------------------------------------
  describe('findAndCount()', () => {
    it('injects tenant WHERE clause', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);
      const repo = buildRepo({ tenant: 'acme' });
      await repo.findAndCount({ where: { active: true } });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true, tenant: 'acme' } }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findBy()
  // ---------------------------------------------------------------------------
  describe('findBy()', () => {
    it('injects tenant into where clause', async () => {
      mockRepository.findBy.mockResolvedValue([]);
      const repo = buildRepo({ tenant: 'acme' });
      await repo.findBy({ active: true });

      expect(mockRepository.findBy).toHaveBeenCalledWith({
        active: true,
        tenant: 'acme',
      });
    });

    it('handles array where clause by adding tenant to each element', async () => {
      mockRepository.findBy.mockResolvedValue([]);
      const repo = buildRepo({ tenant: 'acme' });
      await repo.findBy([{ active: true }, { archived: false }]);

      const calledWith = mockRepository.findBy.mock.calls[0][0];
      expect(Array.isArray(calledWith)).toBe(true);
      expect(calledWith[0]).toEqual({ active: true, tenant: 'acme' });
      expect(calledWith[1]).toEqual({ archived: false, tenant: 'acme' });
    });

    it('expands array where elements when allowMissingTenant is true', async () => {
      mockRepository.findBy.mockResolvedValue([]);
      const repo = buildRepo({ tenant: 'acme', allowMissingTenant: true });
      await repo.findBy([{ active: true }]);

      const calledWith = mockRepository.findBy.mock.calls[0][0];
      expect(Array.isArray(calledWith)).toBe(true);
      // Each element expands into two (with tenant and with null)
      expect(calledWith).toHaveLength(2);
      expect(calledWith[0]).toEqual({ active: true, tenant: 'acme' });
      expect(calledWith[1]).toEqual({ active: true, tenant: null });
    });

    it('produces array condition for scalar where when allowMissingTenant is true', async () => {
      mockRepository.findBy.mockResolvedValue([]);
      const repo = buildRepo({ tenant: 'acme', allowMissingTenant: true });
      await repo.findBy({ active: true });

      const calledWith = mockRepository.findBy.mock.calls[0][0];
      expect(Array.isArray(calledWith)).toBe(true);
      expect(calledWith).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // findOneBy()
  // ---------------------------------------------------------------------------
  describe('findOneBy()', () => {
    it('injects tenant into where clause', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      const repo = buildRepo({ tenant: 'acme' });
      await repo.findOneBy({ id: 1 });

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: 1,
        tenant: 'acme',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // count()
  // ---------------------------------------------------------------------------
  describe('count()', () => {
    it('injects tenant WHERE clause', async () => {
      mockRepository.count.mockResolvedValue(5);
      const repo = buildRepo({ tenant: 'acme' });
      await repo.count({ where: { active: true } });

      expect(mockRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true, tenant: 'acme' } }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // createQueryBuilder()
  // ---------------------------------------------------------------------------
  describe('createQueryBuilder()', () => {
    it('calls andWhere with tenant condition using the alias', () => {
      const repo = buildRepo({ tenant: 'acme' });
      repo.createQueryBuilder('e');

      expect(mockQb.andWhere).toHaveBeenCalledWith('e.tenant = :__mt_tenant', {
        __mt_tenant: 'acme',
      });
    });

    it('calls andWhere without alias prefix when alias is not provided', () => {
      const repo = buildRepo({ tenant: 'acme' });
      repo.createQueryBuilder();

      expect(mockQb.andWhere).toHaveBeenCalledWith('tenant = :__mt_tenant', {
        __mt_tenant: 'acme',
      });
    });

    it('uses OR condition when allowMissingTenant is true', () => {
      const repo = buildRepo({ tenant: 'acme', allowMissingTenant: true });
      repo.createQueryBuilder('e');

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(e.tenant = :__mt_tenant OR e.tenant IS NULL)',
        { __mt_tenant: 'acme' },
      );
    });

    it('returns the query builder', () => {
      const repo = buildRepo({ tenant: 'acme' });
      const qb = repo.createQueryBuilder('e');
      expect(qb).toBe(mockQb);
    });
  });

  // ---------------------------------------------------------------------------
  // Tenancy disabled
  // ---------------------------------------------------------------------------
  describe('when tenancy is disabled', () => {
    it('find() passes options through without tenant injection', async () => {
      mockRepository.find.mockResolvedValue([]);
      const repo = buildRepo({ enabled: false });
      const opts = { where: { name: 'foo' } };
      await repo.find(opts);

      expect(mockRepository.find).toHaveBeenCalledWith(opts);
    });

    it('findBy() passes where through without tenant injection', async () => {
      mockRepository.findBy.mockResolvedValue([]);
      const repo = buildRepo({ enabled: false });
      const where = { active: true };
      await repo.findBy(where);

      expect(mockRepository.findBy).toHaveBeenCalledWith(where);
    });

    it('createQueryBuilder() skips andWhere when disabled', () => {
      const repo = buildRepo({ enabled: false });
      repo.createQueryBuilder('e');
      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // When tenancy service is not available
  // ---------------------------------------------------------------------------
  describe('when getTenancyService returns null', () => {
    it('find() passes options through unmodified', async () => {
      mockGetTenancyService.mockReturnValue(null);
      const repo = new TenantBaseRepository<TestEntity>(
        TestEntity,
        mockDataSource,
      );
      mockRepository.find.mockResolvedValue([]);
      const opts = { where: { name: 'bar' } };
      await repo.find(opts);

      expect(mockRepository.find).toHaveBeenCalledWith(opts);
    });
  });

  // ---------------------------------------------------------------------------
  // save() / remove() / softRemove() delegation
  // ---------------------------------------------------------------------------
  describe('save()', () => {
    it('delegates to rawRepository.save', async () => {
      const entity = new TestEntity();
      mockRepository.save.mockResolvedValue(entity);
      const repo = buildRepo();
      const result = await repo.save(entity);
      expect(mockRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });

    it('delegates array of entities to rawRepository.save', async () => {
      const entities = [new TestEntity(), new TestEntity()];
      mockRepository.save.mockResolvedValue(entities);
      const repo = buildRepo();
      const result = await repo.save(entities);
      expect(mockRepository.save).toHaveBeenCalledWith(entities);
      expect(result).toBe(entities);
    });
  });

  describe('remove()', () => {
    it('delegates to rawRepository.remove', async () => {
      const entity = new TestEntity();
      mockRepository.remove.mockResolvedValue(entity);
      const repo = buildRepo();
      const result = await repo.remove(entity);
      expect(mockRepository.remove).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });

  describe('softRemove()', () => {
    it('delegates to rawRepository.softRemove', async () => {
      const entity = new TestEntity();
      mockRepository.softRemove.mockResolvedValue(entity);
      const repo = buildRepo();
      const result = await repo.softRemove(entity);
      expect(mockRepository.softRemove).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });
});
