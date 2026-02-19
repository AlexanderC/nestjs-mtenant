import { DecoratorError } from './decorator.error';
import { BaseError } from './mtenant.error';

describe('DecoratorError', () => {
  it('should be defined', () => {
    expect(DecoratorError).toBeDefined();
  });

  it('should extend BaseError', () => {
    const error = new DecoratorError('test message');
    expect(error).toBeInstanceOf(BaseError);
  });

  it('should extend Error', () => {
    const error = new DecoratorError('test message');
    expect(error).toBeInstanceOf(Error);
  });

  it('should be an instance of DecoratorError', () => {
    const error = new DecoratorError('test message');
    expect(error).toBeInstanceOf(DecoratorError);
  });

  it('should carry the provided message', () => {
    const message = 'decorator usage error';
    const error = new DecoratorError(message);
    expect(error.message).toBe(message);
  });

  it('should have a name property equal to "Error" (default inherited name)', () => {
    const error = new DecoratorError('test');
    // TypeScript bare `extends Error` subclasses compiled to ES2020 inherit
    // the prototype name "Error" unless the subclass explicitly sets this.name.
    expect(error.name).toBe('Error');
  });

  it('should be throwable and catchable as DecoratorError', () => {
    expect(() => {
      throw new DecoratorError('thrown');
    }).toThrow(DecoratorError);
  });

  it('should be throwable and catchable as BaseError', () => {
    expect(() => {
      throw new DecoratorError('thrown');
    }).toThrow(BaseError);
  });

  it('should be throwable and catchable as Error', () => {
    expect(() => {
      throw new DecoratorError('thrown');
    }).toThrow(Error);
  });

  it('should support being instantiated without a message', () => {
    const error = new DecoratorError();
    expect(error).toBeInstanceOf(DecoratorError);
    expect(error.message).toBe('');
  });
});
