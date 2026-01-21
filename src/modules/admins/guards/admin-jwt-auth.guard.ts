import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AdminJwtTokenService } from '../services/admin-jwt.service';

@Injectable()
export class AdminJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdminJwtAuthGuard.name);

  constructor(private readonly adminJwtTokenService: AdminJwtTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('[ADMIN] No authorization header found');
      throw new UnauthorizedException('No authorization header');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      this.logger.warn('[ADMIN] Invalid authorization header format');
      throw new UnauthorizedException('Invalid authorization header');
    }

    try {
      const payload = this.adminJwtTokenService.verifyAccessToken(token);
      request.user = payload;
      return true;
    } catch (error: any) {
      this.logger.error('[ADMIN] Token verification failed:', error.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

