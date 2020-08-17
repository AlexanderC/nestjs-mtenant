import { Options } from './module.options';

export interface OptionsFactory {
  createOptions(): Promise<Options> | Options;
}
