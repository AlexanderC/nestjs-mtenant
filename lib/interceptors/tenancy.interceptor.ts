import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CoreService } from '../core.service';
import { TenantContext } from '../interfaces/core.interface';

@Injectable()
export class TenancyInterceptor implements NestInterceptor {
  constructor(protected readonly coreService: CoreService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request: TenantContext = context.switchToHttp().getRequest();
    await this.coreService.injectTenancyScope(request);
    return next.handle();
  }
}
