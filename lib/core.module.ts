import {
  Module,
  DynamicModule,
  Global,
  Provider,
  MiddlewareConsumer,
  RequestMethod,
  NestModule,
} from '@nestjs/common';
import { AsyncHooksModule } from '@nestjs-steroids/async-context';
import { ValueProvider } from '@nestjs/common/interfaces';
import { Options } from './interfaces/module.options';
import { AsyncOptions } from './interfaces/module-async.options';
import { OptionsFactory } from './interfaces/module-options.factory';
import { CoreService } from './core.service';
import { MT_OPTIONS } from './constants';
import { TenancyMiddleware } from './middlewares/tenancy.middleware';

@Global()
@Module({
  imports: [AsyncHooksModule],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenancyMiddleware).forRoutes({
      // The fastify package uses the latest version of the path-to-regexp package,
      // which no longer supports wildcard asterisks *.
      // Instead, you must use parameters (e.g., (.*), :splat*).
      path: '(.*)',
      method: RequestMethod.ALL,
    });
  }

  static forRoot(options?: Options): DynamicModule {
    const OptionsProvider: ValueProvider<Options> = {
      provide: MT_OPTIONS,
      useValue: options,
    };

    return {
      module: CoreModule,
      providers: [OptionsProvider, CoreService],
      exports: [CoreService],
    };
  }

  static forRootAsync(options: AsyncOptions): DynamicModule {
    const providers: Provider[] = this.createAsyncProviders(options);

    return {
      module: CoreModule,
      providers: [...providers, CoreService],
      imports: options.imports,
      exports: [CoreService],
    };
  }

  private static createAsyncProviders(options: AsyncOptions): Provider[] {
    const providers: Provider[] = [this.createAsyncOptionsProvider(options)];

    if (options.useClass) {
      providers.push({
        provide: options.useClass,
        useClass: options.useClass,
      });
    }

    return providers;
  }

  private static createAsyncOptionsProvider(options: AsyncOptions): Provider {
    if (options.useFactory) {
      return {
        name: MT_OPTIONS,
        provide: MT_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      name: MT_OPTIONS,
      provide: MT_OPTIONS,
      useFactory: async (optionsFactory: OptionsFactory) => {
        return optionsFactory.createOptions();
      },
      inject: [options.useExisting! || options.useClass!],
    };
  }
}
