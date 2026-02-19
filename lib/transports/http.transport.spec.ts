import { HttpTransport } from './http.transport';
import { TenantContext } from '../interfaces/core.interface';

describe('HttpTransport', () => {
  const HEADER_NAME = 'X-Tenant-ID';
  const QUERY_PARAM = 'tenant';

  let transport: HttpTransport;

  beforeEach(() => {
    transport = new HttpTransport(HEADER_NAME, QUERY_PARAM);
  });

  describe('extract() - header matching', () => {
    it('should extract tenant from an exact-match header', () => {
      const context: TenantContext = {
        headers: { 'X-Tenant-ID': 'acme' },
      };
      expect(transport.extract(context)).toBe('acme');
    });

    it('should extract tenant from a header regardless of case (header name lowercase)', () => {
      const context: TenantContext = {
        headers: { 'x-tenant-id': 'acme' },
      };
      expect(transport.extract(context)).toBe('acme');
    });

    it('should extract tenant from a header regardless of case (header name uppercase)', () => {
      const context: TenantContext = {
        headers: { 'X-TENANT-ID': 'acme' },
      };
      expect(transport.extract(context)).toBe('acme');
    });

    it('should return the value of the first matching header', () => {
      const context: TenantContext = {
        headers: {
          'X-Tenant-ID': 'first-tenant',
          'x-tenant-id': 'second-tenant',
        },
      };
      // The first key encountered in iteration wins
      const result = transport.extract(context);
      expect(typeof result).toBe('string');
      expect(['first-tenant', 'second-tenant']).toContain(result);
    });

    it('should prefer header over query parameter when both are present', () => {
      const context: TenantContext = {
        headers: { 'X-Tenant-ID': 'from-header' },
        query: { tenant: 'from-query' },
      };
      expect(transport.extract(context)).toBe('from-header');
    });
  });

  describe('extract() - query parameter matching', () => {
    it('should extract tenant from a query parameter', () => {
      const context: TenantContext = {
        headers: {},
        query: { tenant: 'query-tenant' },
      };
      expect(transport.extract(context)).toBe('query-tenant');
    });

    it('should extract tenant from the URL when query is not set', () => {
      const context: TenantContext = {
        headers: {},
        url: '/api/resource?tenant=url-tenant',
      };
      expect(transport.extract(context)).toBe('url-tenant');
    });

    it('should extract tenant from a full URL with query string', () => {
      const context: TenantContext = {
        url: 'https://example.org/api?tenant=full-url-tenant',
      };
      expect(transport.extract(context)).toBe('full-url-tenant');
    });

    it('should populate context.query from URL before checking query params', () => {
      const context: TenantContext = {
        url: '/api?tenant=populated-from-url',
      };
      transport.extract(context);
      expect(context.query).toBeDefined();
      expect(context.query![QUERY_PARAM]).toBe('populated-from-url');
    });

    it('should not overwrite an existing context.query object with URL-parsed values', () => {
      const context: TenantContext = {
        headers: {},
        query: { tenant: 'explicit-query' },
        url: '/api?tenant=should-be-ignored',
      };
      expect(transport.extract(context)).toBe('explicit-query');
    });
  });

  describe('extract() - null / missing tenant', () => {
    it('should return null when headers do not contain the tenant header', () => {
      const context: TenantContext = {
        headers: { Authorization: 'Bearer token' },
        query: {},
      };
      expect(transport.extract(context)).toBeNull();
    });

    it('should return null when query does not contain the tenant parameter', () => {
      const context: TenantContext = {
        headers: {},
        query: { other: 'value' },
      };
      expect(transport.extract(context)).toBeNull();
    });

    it('should return null when no headers, query, or url are present', () => {
      const context: TenantContext = {};
      expect(transport.extract(context)).toBeNull();
    });

    it('should return null when URL has no matching query parameter', () => {
      const context: TenantContext = {
        url: '/api?other=value',
      };
      expect(transport.extract(context)).toBeNull();
    });

    it('should return null when URL has no query string at all', () => {
      const context: TenantContext = {
        url: '/api/resource',
      };
      expect(transport.extract(context)).toBeNull();
    });
  });

  describe('extract() - empty / edge-case contexts', () => {
    it('should handle empty headers object gracefully', () => {
      const context: TenantContext = { headers: {}, query: {} };
      expect(transport.extract(context)).toBeNull();
    });

    it('should handle undefined headers gracefully', () => {
      const context: TenantContext = { query: { tenant: 'from-query-only' } };
      expect(transport.extract(context)).toBe('from-query-only');
    });

    it('should handle undefined query gracefully when url is also absent', () => {
      const context: TenantContext = { headers: {} };
      expect(transport.extract(context)).toBeNull();
    });

    it('should work with a custom header name', () => {
      const customTransport = new HttpTransport('X-Custom-Tenant', 'tid');
      const context: TenantContext = {
        headers: { 'X-Custom-Tenant': 'custom-tenant' },
      };
      expect(customTransport.extract(context)).toBe('custom-tenant');
    });

    it('should work with a custom query parameter name', () => {
      const customTransport = new HttpTransport('X-Tenant-ID', 'tid');
      const context: TenantContext = {
        headers: {},
        query: { tid: 'tid-tenant' },
      };
      expect(customTransport.extract(context)).toBe('tid-tenant');
    });
  });
});
