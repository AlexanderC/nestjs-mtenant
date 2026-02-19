import { StaticImplements } from './helpers';

describe('StaticImplements', () => {
  it('should return a decorator function', () => {
    const decorator = StaticImplements();
    expect(typeof decorator).toBe('function');
  });

  it('should return a decorator that accepts a constructor', () => {
    const decorator = StaticImplements<{ staticMethod(): void }>();

    class TestClass {
      static staticMethod() {}
    }

    expect(() => decorator(TestClass)).not.toThrow();
  });

  it('should not modify the constructor', () => {
    const decorator = StaticImplements();

    class TestClass {}

    const result = decorator(TestClass);

    expect(result).toBeUndefined();
    expect(TestClass).toBeDefined();
  });

  it('should work as a class decorator', () => {
    interface StaticContract {
      create(): void;
    }

    @StaticImplements<StaticContract>()
    class TestClass {
      static create() {}
    }

    expect(TestClass).toBeDefined();
    expect(typeof TestClass.create).toBe('function');
  });

  it('should be callable multiple times producing independent decorators', () => {
    const decoratorA = StaticImplements();
    const decoratorB = StaticImplements();

    expect(decoratorA).not.toBe(decoratorB);
  });
});
