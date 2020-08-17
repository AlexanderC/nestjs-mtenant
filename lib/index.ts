/** Modules **/
export { CoreModule as MTModule } from './core.module';

/** Constants **/
export {
  MT_OPTIONS,
} from './constants';

/** Interfaces **/
export { Options as MTModuleOptions } from './interfaces/module.options';
export { AsyncOptions as MTModuleAsyncOptions } from './interfaces/module-async.options';
export { OptionsFactory as MTModuleOptionsFactory } from './interfaces/module-options.factory';


/** Services **/
export { CoreService as MTService } from './core.service';

/** Models **/

/** Decorators */

/** Internals */

/** Errors */
export { BaseError as MTError } from './errors/mtenant.error';
export { DecoratorError as MTDecoratorError } from './errors/decorator.error';
