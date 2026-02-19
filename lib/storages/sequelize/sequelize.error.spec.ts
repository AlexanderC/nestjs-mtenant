import { SequelizeError } from './sequelize.error';
import { BaseError } from '../../errors/mtenant.error';

describe('SequelizeError', () => {
  it('should be defined', () => {
    expect(SequelizeError).toBeDefined();
  });

  it('should extend BaseError', () => {
    const error = new SequelizeError('test message');
    expect(error).toBeInstanceOf(BaseError);
  });

  it('should extend Error', () => {
    const error = new SequelizeError('test message');
    expect(error).toBeInstanceOf(Error);
  });

  it('should be an instance of SequelizeError', () => {
    const error = new SequelizeError('test message');
    expect(error).toBeInstanceOf(SequelizeError);
  });

  it('should carry the provided message', () => {
    const message = 'sequelize storage error';
    const error = new SequelizeError(message);
    expect(error.message).toBe(message);
  });

  it('should have a name property equal to "Error" (default inherited name)', () => {
    const error = new SequelizeError('test');
    // TypeScript bare `extends Error` subclasses compiled to ES2020 inherit
    // the prototype name "Error" unless the subclass explicitly sets this.name.
    expect(error.name).toBe('Error');
  });

  it('should be throwable and catchable as SequelizeError', () => {
    expect(() => {
      throw new SequelizeError('thrown');
    }).toThrow(SequelizeError);
  });

  it('should be throwable and catchable as BaseError', () => {
    expect(() => {
      throw new SequelizeError('thrown');
    }).toThrow(BaseError);
  });

  it('should be throwable and catchable as Error', () => {
    expect(() => {
      throw new SequelizeError('thrown');
    }).toThrow(Error);
  });

  it('should support being instantiated without a message', () => {
    const error = new SequelizeError();
    expect(error).toBeInstanceOf(SequelizeError);
    expect(error.message).toBe('');
  });
});
