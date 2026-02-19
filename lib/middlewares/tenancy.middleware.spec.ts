import 'reflect-metadata';
import { TenancyMiddleware } from './tenancy.middleware';
import { MtenantService } from '../mtenant.service';
import { TenantContext } from '../interfaces/core.interface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockService(): jest.Mocked<
  Pick<MtenantService, 'runWithinTenancyScope'>
> {
  return {
    runWithinTenancyScope: jest.fn().mockResolvedValue(undefined),
  };
}

function makeRequest(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    headers: { 'x-tenant-id': 'acme' },
    query: {},
    url: '/api/resource',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TenancyMiddleware', () => {
  let middleware: TenancyMiddleware;
  let mockService: ReturnType<typeof makeMockService>;

  beforeEach(() => {
    mockService = makeMockService();
    middleware = new TenancyMiddleware(
      mockService as unknown as MtenantService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use()', () => {
    it('calls coreService.runWithinTenancyScope exactly once', async () => {
      const request = makeRequest();
      const next = jest.fn();

      await middleware.use(request, {}, next);

      expect(mockService.runWithinTenancyScope).toHaveBeenCalledTimes(1);
    });

    it('passes the request object as the first argument', async () => {
      const request = makeRequest({
        headers: { 'x-tenant-id': 'widgets-inc' },
      });
      const next = jest.fn();

      await middleware.use(request, {}, next);

      expect(mockService.runWithinTenancyScope).toHaveBeenCalledWith(
        request,
        next,
      );
    });

    it('passes the next function as the second argument', async () => {
      const request = makeRequest();
      const next = jest.fn();

      await middleware.use(request, {}, next);

      expect(mockService.runWithinTenancyScope).toHaveBeenCalledWith(
        expect.anything(),
        next,
      );
    });

    it('awaits the promise returned by runWithinTenancyScope', async () => {
      let resolved = false;
      mockService.runWithinTenancyScope.mockImplementation(async () => {
        await Promise.resolve();
        resolved = true;
      });

      await middleware.use(makeRequest(), {}, jest.fn());

      expect(resolved).toBe(true);
    });

    it('propagates rejections from runWithinTenancyScope', async () => {
      const error = new Error('scope setup failed');
      mockService.runWithinTenancyScope.mockRejectedValue(error);

      await expect(
        middleware.use(makeRequest(), {}, jest.fn()),
      ).rejects.toThrow('scope setup failed');
    });

    it('does not call next directly — delegates entirely to coreService', async () => {
      const next = jest.fn();
      mockService.runWithinTenancyScope.mockResolvedValue(undefined);

      await middleware.use(makeRequest(), {}, next);

      // The middleware itself never calls next; that is coreService's responsibility.
      expect(next).not.toHaveBeenCalled();
    });

    it('ignores the _response argument (second parameter)', async () => {
      const request = makeRequest();
      const next = jest.fn();
      const response = { send: jest.fn(), status: jest.fn() };

      await middleware.use(request, response, next);

      // runWithinTenancyScope should NOT receive the response object.
      expect(mockService.runWithinTenancyScope).toHaveBeenCalledWith(
        request,
        next,
      );
      expect(mockService.runWithinTenancyScope).not.toHaveBeenCalledWith(
        expect.anything(),
        response,
        expect.anything(),
      );
    });
  });
});
