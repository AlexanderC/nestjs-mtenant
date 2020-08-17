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

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: TenantContext = context.switchToHttp().getRequest();
    this.coreService.injectTenancyScope(request);
    return next.handle();
  }
}
