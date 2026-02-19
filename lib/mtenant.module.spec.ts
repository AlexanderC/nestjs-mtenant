import 'reflect-metadata';
import { MtenantModule } from './mtenant.module';
import { MtenantService } from './mtenant.service';
import { MT_OPTIONS } from './constants';

describe('MtenantModule', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // forRoot()
  // ---------------------------------------------------------------------------
  describe('forRoot()', () => {
    it('returns a DynamicModule with MtenantModule as the module', () => {
      const dynamicModule = MtenantModule.forRoot({ for: [] });
      expect(dynamicModule.module).toBe(MtenantModule);
    });

    it('includes an MT_OPTIONS ValueProvider with the supplied options', () => {
      const options = { for: [], defaultTenant: 'test-tenant' };
      const dynamicModule = MtenantModule.forRoot(options);

      const optionsProvider = dynamicModule.providers.find(
        (p: any) => p.provide === MT_OPTIONS,
      );
      expect(optionsProvider).toBeDefined();
      expect((optionsProvider as any).useValue).toBe(options);
    });

    it('includes MT_OPTIONS provider with undefined when called with no arguments', () => {
      const dynamicModule = MtenantModule.forRoot();
      const optionsProvider = dynamicModule.providers.find(
        (p: any) => p.provide === MT_OPTIONS,
      );
      expect(optionsProvider).toBeDefined();
      expect((optionsProvider as any).useValue).toBeUndefined();
    });

    it('includes MtenantService as a provider', () => {
      const dynamicModule = MtenantModule.forRoot({ for: [] });
      expect(dynamicModule.providers).toContain(MtenantService);
    });

    it('exports MtenantService', () => {
      const dynamicModule = MtenantModule.forRoot({ for: [] });
      expect(dynamicModule.exports).toContain(MtenantService);
    });

    it('providers array contains exactly two items (MT_OPTIONS + MtenantService)', () => {
      const dynamicModule = MtenantModule.forRoot({ for: [] });
      expect(dynamicModule.providers).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // forRootAsync() - useFactory
  // ---------------------------------------------------------------------------
  describe('forRootAsync() with useFactory', () => {
    it('returns a DynamicModule with MtenantModule as the module', () => {
      const dynamicModule = MtenantModule.forRootAsync({
        useFactory: () => ({ for: [] }),
      });
      expect(dynamicModule.module).toBe(MtenantModule);
    });

    it('creates a factory provider with MT_OPTIONS as the token', () => {
      const factory = jest.fn().mockResolvedValue({ for: [] });
      const dynamicModule = MtenantModule.forRootAsync({ useFactory: factory });

      const optionsProvider = dynamicModule.providers.find(
        (p: any) => p.provide === MT_OPTIONS,
      );
      expect(optionsProvider).toBeDefined();
      expect((optionsProvider as any).useFactory).toBe(factory);
    });

    it('uses empty inject array when inject is not provided', () => {
      const factory = jest.fn();
      const dynamicModule = MtenantModule.forRootAsync({ useFactory: factory });

      const optionsProvider = dynamicModule.providers.find(
        (p: any) => p.provide === MT_OPTIONS,
      );
      expect((optionsProvider as any).inject).toEqual([]);
    });

    it('passes inject tokens to the factory provider', () => {
      const TOKEN_A = 'TOKEN_A';
      const TOKEN_B = 'TOKEN_B';
      const factory = jest.fn();
      const dynamicModule = MtenantModule.forRootAsync({
        useFactory: factory,
        inject: [TOKEN_A, TOKEN_B],
      });

      const optionsProvider = dynamicModule.providers.find(
        (p: any) => p.provide === MT_OPTIONS,
      );
      expect((optionsProvider as any).inject).toEqual([TOKEN_A, TOKEN_B]);
    });

    it('includes MtenantService as a provider', () => {
      const dynamicModule = MtenantModule.forRootAsync({
        useFactory: () => ({ for: [] }),
      });
      expect(dynamicModule.providers).toContain(MtenantService);
    });

    it('exports MtenantService', () => {
      const dynamicModule = MtenantModule.forRootAsync({
        useFactory: () => ({ for: [] }),
      });
      expect(dynamicModule.exports).toContain(MtenantService);
    });

    it('includes imports from async options', () => {
      const FakeModule = class {};
      const dynamicModule = MtenantModule.forRootAsync({
        useFactory: () => ({ for: [] }),
        imports: [FakeModule as any],
      });
      expect(dynamicModule.imports).toContain(FakeModule);
    });

    it('sets imports to undefined when none are provided', () => {
      const dynamicModule = MtenantModule.forRootAsync({
        useFactory: () => ({ for: [] }),
      });
      expect(dynamicModule.imports).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // forRootAsync() - useClass
  // ---------------------------------------------------------------------------
  describe('forRootAsync() with useClass', () => {
    it('creates a class provider for the options factory', () => {
      class MyOptionsFactory {
        createOptions() {
          return { for: [] };
        }
      }

      const dynamicModule = MtenantModule.forRootAsync({
        useClass: MyOptionsFactory,
      });

      // Should have the class provider registered so DI can instantiate it
      const classProvider = dynamicModule.providers.find(
        (p: any) => p.useClass === MyOptionsFactory,
      );
      expect(classProvider).toBeDefined();
    });

    it('creates an MT_OPTIONS factory provider that calls createOptions()', () => {
      class MyOptionsFactory {
        createOptions() {
          return { for: [] };
        }
      }

      const dynamicModule = MtenantModule.forRootAsync({
        useClass: MyOptionsFactory,
      });

      const optionsProvider = dynamicModule.providers.find(
        (p: any) => p.provide === MT_OPTIONS,
      );
      expect(optionsProvider).toBeDefined();
      expect((optionsProvider as any).useFactory).toBeDefined();
    });

    it('includes the useClass class in the inject array of the factory provider', () => {
      class MyOptionsFactory {
        createOptions() {
          return { for: [] };
        }
      }

      const dynamicModule = MtenantModule.forRootAsync({
        useClass: MyOptionsFactory,
      });

      const optionsProvider = dynamicModule.providers.find(
        (p: any) => p.provide === MT_OPTIONS,
      );
      expect((optionsProvider as any).inject).toContain(MyOptionsFactory);
    });

    it('includes MtenantService as a provider', () => {
      class MyOptionsFactory {
        createOptions() {
          return { for: [] };
        }
      }
      const dynamicModule = MtenantModule.forRootAsync({
        useClass: MyOptionsFactory,
      });
      expect(dynamicModule.providers).toContain(MtenantService);
    });

    it('exports MtenantService', () => {
      class MyOptionsFactory {
        createOptions() {
          return { for: [] };
        }
      }
      const dynamicModule = MtenantModule.forRootAsync({
        useClass: MyOptionsFactory,
      });
      expect(dynamicModule.exports).toContain(MtenantService);
    });
  });

  // ---------------------------------------------------------------------------
  // forRootAsync() - useExisting
  // ---------------------------------------------------------------------------
  describe('forRootAsync() with useExisting', () => {
    it('creates a factory provider that injects the existing service', () => {
      class ExistingOptionsFactory {
        createOptions() {
          return { for: [] };
        }
      }

      const dynamicModule = MtenantModule.forRootAsync({
        useExisting: ExistingOptionsFactory,
      });

      const optionsProvider = dynamicModule.providers.find(
        (p: any) => p.provide === MT_OPTIONS,
      );
      expect(optionsProvider).toBeDefined();
      expect((optionsProvider as any).inject).toContain(ExistingOptionsFactory);
    });

    it('does NOT create an extra class provider for useExisting (reuses existing)', () => {
      class ExistingOptionsFactory {
        createOptions() {
          return { for: [] };
        }
      }

      const dynamicModule = MtenantModule.forRootAsync({
        useExisting: ExistingOptionsFactory,
      });

      const classProviders = dynamicModule.providers.filter(
        (p: any) => p.useClass === ExistingOptionsFactory,
      );
      // useExisting reuses an already-registered provider, no new class provider
      expect(classProviders).toHaveLength(0);
    });
  });
});
