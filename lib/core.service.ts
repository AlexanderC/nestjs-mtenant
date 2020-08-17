import { Injectable, Inject } from '@nestjs/common';
import { BaseError } from './errors/mtenant.error';
import { Options } from './interfaces/module.options';
import { MT_OPTIONS } from './constants';

@Injectable()
export class CoreService {
  constructor(@Inject(MT_OPTIONS) private readonly options: Options) {
    this.setup(options);
  }

  protected setup(options: Options): void {
    
  }
}
