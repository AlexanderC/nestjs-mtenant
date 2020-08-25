import { Injectable, NestMiddleware } from '@nestjs/common';
import { MtenantService } from '../mtenant.service';
import { TenantContext } from '../interfaces/core.interface';

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  constructor(protected readonly coreService: MtenantService) {}

  async use(
    request: TenantContext,
    _response: any,
    next: Function,
  ): Promise<void> {
    await this.coreService.runWithinTenancyScope(request, next);
  }
}
