import 'reflect-metadata';

// ---------------------------------------------------------------------------
// Mocks — must be declared BEFORE importing the module under test so that
// Jest's module registry resolves the mocked versions.
// ---------------------------------------------------------------------------

const mockApplyDecorators = jest.fn((...decorators: any[]) => 'applied');
const mockApiHeader = jest.fn((opts: any) => `ApiHeader(${opts.name})`);
const mockApiQuery = jest.fn((opts: any) => `ApiQuery(${opts.name})`);

jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  applyDecorators: (...args: any[]) => mockApplyDecorators(...args),
}));

jest.mock('@nestjs/swagger', () => ({
  ApiHeader: (opts: any) => mockApiHeader(opts),
  ApiQuery: (opts: any) => mockApiQuery(opts),
}));

import { Api } from './api';
import { TenantTransport } from '../interfaces/core.interface';
import { MT_HEADER_NAME, MT_QUERY_PARAMETER_NAME } from '../constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  mockApplyDecorators.mockClear();
  mockApiHeader.mockClear();
  mockApiQuery.mockClear();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Api decorator', () => {
  beforeEach(resetMocks);

  describe('HTTP transport (default)', () => {
    it('creates an ApiHeader decorator with the default header name', () => {
      Api();

      expect(mockApiHeader).toHaveBeenCalledTimes(1);
      const callArg = mockApiHeader.mock.calls[0][0];
      expect(callArg.name).toBe(MT_HEADER_NAME);
    });

    it('passes required=false and allowEmptyValue=true to ApiHeader', () => {
      Api();

      const callArg = mockApiHeader.mock.calls[0][0];
      expect(callArg.required).toBe(false);
      expect(callArg.allowEmptyValue).toBe(true);
    });

    it('does not create an ApiQuery decorator when includeQuery is omitted', () => {
      Api();

      expect(mockApiQuery).not.toHaveBeenCalled();
    });

    it('passes the ApiHeader result to applyDecorators', () => {
      Api();

      expect(mockApplyDecorators).toHaveBeenCalledTimes(1);
      // The single argument to applyDecorators should be the ApiHeader mock return value.
      expect(mockApplyDecorators.mock.calls[0]).toContain(
        `ApiHeader(${MT_HEADER_NAME})`,
      );
    });

    it('returns the result of applyDecorators', () => {
      const result = Api();

      expect(result).toBe('applied');
    });
  });

  describe('includeQuery option', () => {
    it('adds an ApiQuery decorator when includeQuery=true', () => {
      Api({ includeQuery: true });

      expect(mockApiQuery).toHaveBeenCalledTimes(1);
    });

    it('uses the default query parameter name', () => {
      Api({ includeQuery: true });

      const callArg = mockApiQuery.mock.calls[0][0];
      expect(callArg.name).toBe(MT_QUERY_PARAMETER_NAME);
    });

    it('passes required=false and allowEmptyValue=true to ApiQuery', () => {
      Api({ includeQuery: true });

      const callArg = mockApiQuery.mock.calls[0][0];
      expect(callArg.required).toBe(false);
      expect(callArg.allowEmptyValue).toBe(true);
    });

    it('passes both ApiHeader and ApiQuery to applyDecorators', () => {
      Api({ includeQuery: true });

      expect(mockApplyDecorators).toHaveBeenCalledTimes(1);
      const decoratorArgs = mockApplyDecorators.mock.calls[0];
      expect(decoratorArgs).toHaveLength(2);
    });

    it('does not create ApiQuery when includeQuery=false', () => {
      Api({ includeQuery: false });

      expect(mockApiQuery).not.toHaveBeenCalled();
    });
  });

  describe('custom headerName', () => {
    it('uses the provided headerName', () => {
      Api({ headerName: 'X-Custom-Tenant' });

      const callArg = mockApiHeader.mock.calls[0][0];
      expect(callArg.name).toBe('X-Custom-Tenant');
    });
  });

  describe('custom queryParameterName', () => {
    it('uses the provided queryParameterName', () => {
      Api({ includeQuery: true, queryParameterName: 'x-tenant-param' });

      const callArg = mockApiQuery.mock.calls[0][0];
      expect(callArg.name).toBe('x-tenant-param');
    });
  });

  describe('explicit HTTP transport', () => {
    it('behaves identically to the default when transport=HTTP', () => {
      Api({ transport: TenantTransport.HTTP });

      expect(mockApiHeader).toHaveBeenCalledTimes(1);
      expect(mockApiQuery).not.toHaveBeenCalled();
    });
  });

  describe('unknown transport', () => {
    it('throws a BaseError for an unrecognised transport value', () => {
      expect(() =>
        Api({ transport: 'grpc' as unknown as TenantTransport }),
      ).toThrow();
    });
  });
});
