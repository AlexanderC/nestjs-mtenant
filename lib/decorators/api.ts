import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { MT_HEADER_NAME, DEFAULT_TRANSPORT } from '../constants';
import { TenantTransport } from '../interfaces/core.interface';
import { BaseError } from '../errors/mtenant.error';

export interface ApiOptions {
  transport?: TenantTransport;
  headerName?: string;
}

export function Api(options: ApiOptions = {}) {
  switch (options.transport || DEFAULT_TRANSPORT) {
    case TenantTransport.HEADER:
      return applyDecorators(
        ApiHeader({
          name: options.headerName || MT_HEADER_NAME,
          description: 'Header used to set custom tenant or the call.',
          required: false,
          allowEmptyValue: true,
        }),
      );
    default:
      throw new BaseError(
        `Unknown tenant transport "${this.options.transport}"`,
      );
  }
}
