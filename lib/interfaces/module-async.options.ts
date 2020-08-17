import { ModuleMetadata, Type } from '@nestjs/common/interfaces';
import { Options } from './module.options';
import { OptionsFactory } from './module-options.factory';

export interface AsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useClass?: Type<OptionsFactory>;
  useExisting?: Type<OptionsFactory>;
  useFactory?: (...args: any[]) => Promise<Options> | Options;
}
