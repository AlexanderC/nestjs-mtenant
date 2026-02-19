import { TypeOrmError } from './typeorm.error';
import { BaseError } from '../../errors/mtenant.error';

describe('TypeOrmError', () => {
  it('should be defined', () => {
    expect(TypeOrmError).toBeDefined();
  });

  it('should extend BaseError', () => {
    const error = new TypeOrmError('test message');
    expect(error).toBeInstanceOf(BaseError);
  });

  it('should extend Error', () => {
    const error = new TypeOrmError('test message');
    expect(error).toBeInstanceOf(Error);
  });

  it('should be an instance of TypeOrmError', () => {
    const error = new TypeOrmError('test message');
    expect(error).toBeInstanceOf(TypeOrmError);
  });

  it('should carry the provided message', () => {
    const message = 'typeorm storage error';
    const error = new TypeOrmError(message);
    expect(error.message).toBe(message);
  });

  it('should have a name property equal to "Error" (default inherited name)', () => {
    const error = new TypeOrmError('test');
    // TypeScript bare `extends Error` subclasses compiled to ES2020 inherit
    // the prototype name "Error" unless the subclass explicitly sets this.name.
    expect(error.name).toBe('Error');
  });

  it('should be throwable and catchable as TypeOrmError', () => {
    expect(() => {
      throw new TypeOrmError('thrown');
    }).toThrow(TypeOrmError);
  });

  it('should be throwable and catchable as BaseError', () => {
    expect(() => {
      throw new TypeOrmError('thrown');
    }).toThrow(BaseError);
  });

  it('should be throwable and catchable as Error', () => {
    expect(() => {
      throw new TypeOrmError('thrown');
    }).toThrow(Error);
  });

  it('should support being instantiated without a message', () => {
    const error = new TypeOrmError();
    expect(error).toBeInstanceOf(TypeOrmError);
    expect(error.message).toBe('');
  });
});
