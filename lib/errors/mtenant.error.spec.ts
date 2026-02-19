import { BaseError } from './mtenant.error';

describe('BaseError', () => {
  it('should be defined', () => {
    expect(BaseError).toBeDefined();
  });

  it('should extend Error', () => {
    const error = new BaseError('test message');
    expect(error).toBeInstanceOf(Error);
  });

  it('should be an instance of BaseError', () => {
    const error = new BaseError('test message');
    expect(error).toBeInstanceOf(BaseError);
  });

  it('should carry the provided message', () => {
    const message = 'something went wrong';
    const error = new BaseError(message);
    expect(error.message).toBe(message);
  });

  it('should have a name property equal to "Error" (default inherited name)', () => {
    const error = new BaseError('test');
    // TypeScript bare `extends Error` subclasses compiled to ES2020 inherit
    // the prototype name "Error" unless the subclass explicitly sets this.name.
    expect(error.name).toBe('Error');
  });

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new BaseError('thrown error');
    }).toThrow(BaseError);
  });

  it('should be throwable and catchable as an Error', () => {
    expect(() => {
      throw new BaseError('thrown error');
    }).toThrow(Error);
  });

  it('should support being instantiated without a message', () => {
    const error = new BaseError();
    expect(error).toBeInstanceOf(BaseError);
    expect(error.message).toBe('');
  });
});
