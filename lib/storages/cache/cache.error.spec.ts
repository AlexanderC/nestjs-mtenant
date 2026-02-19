import { CacheError } from './cache.error';
import { BaseError } from '../../errors/mtenant.error';

describe('CacheError', () => {
  it('should be defined', () => {
    expect(CacheError).toBeDefined();
  });

  it('should extend BaseError', () => {
    const error = new CacheError('test message');
    expect(error).toBeInstanceOf(BaseError);
  });

  it('should extend Error', () => {
    const error = new CacheError('test message');
    expect(error).toBeInstanceOf(Error);
  });

  it('should be an instance of CacheError', () => {
    const error = new CacheError('test message');
    expect(error).toBeInstanceOf(CacheError);
  });

  it('should carry the provided message', () => {
    const message = 'cache operation failed';
    const error = new CacheError(message);
    expect(error.message).toBe(message);
  });

  it('should have a name property equal to "Error" (default inherited name)', () => {
    const error = new CacheError('test');
    // TypeScript bare `extends Error` subclasses compiled to ES2020 inherit
    // the prototype name "Error" unless the subclass explicitly sets this.name.
    expect(error.name).toBe('Error');
  });

  it('should be throwable and catchable as CacheError', () => {
    expect(() => {
      throw new CacheError('thrown');
    }).toThrow(CacheError);
  });

  it('should be throwable and catchable as BaseError', () => {
    expect(() => {
      throw new CacheError('thrown');
    }).toThrow(BaseError);
  });

  it('should be throwable and catchable as Error', () => {
    expect(() => {
      throw new CacheError('thrown');
    }).toThrow(Error);
  });

  it('should support being instantiated without a message', () => {
    const error = new CacheError();
    expect(error).toBeInstanceOf(CacheError);
    expect(error.message).toBe('');
  });
});
