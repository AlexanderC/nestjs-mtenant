import { applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiQuery } from '@nestjs/swagger';
import {
  MT_HEADER_NAME,
  MT_QUERY_PARAMETER_NAME,
  DEFAULT_TRANSPORT,
} from '../constants';
import { TenantTransport } from '../interfaces/core.interface';
import { Options } from '../interfaces/module.options';
import { BaseError } from '../errors/mtenant.error';

export interface ApiOptions
  extends Pick<Options, 'transport' | 'headerName' | 'queryParameterName'> {
  includeQuery?: boolean;
}

export function Api(options: ApiOptions = {}) {
  switch (options.transport || DEFAULT_TRANSPORT) {
    case TenantTransport.HTTP:
      const decorators: any = [
        ApiHeader({
          name: options.headerName || MT_HEADER_NAME,
          description: 'Header used to set custom tenant or the call.',
          required: false,
          allowEmptyValue: true,
        }),
      ];

      if (options.includeQuery) {
        decorators.push(
          ApiQuery({
            name: options.queryParameterName || MT_QUERY_PARAMETER_NAME,
            description:
              'Query parameter used to set custom tenant or the call.',
            required: false,
            allowEmptyValue: true,
          }),
        );
      }

      return applyDecorators(...decorators);
    default:
      throw new BaseError(
        `Unknown tenant transport "${this.options.transport}"`,
      );
  }
}
