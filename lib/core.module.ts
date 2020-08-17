import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ValueProvider } from '@nestjs/common/interfaces';
import { Options } from './interfaces/module.options';
import { AsyncOptions } from './interfaces/module-async.options';
import { OptionsFactory } from './interfaces/module-options.factory';
import { CoreService } from './core.service';
import { MT_OPTIONS } from './constants';
import { TenancyInterceptor } from './interceptors/tenancy.interceptor';

@Global()
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenancyInterceptor,
    },
  ],
})
export class CoreModule {
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
