import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AgentJwtService } from '../services/agent-jwt.service';
import { AgentService } from '../agent.service';

@Injectable()
export class AgentJwtAuthGuard implements CanActivate {
  constructor(
    private readonly agentJwtService: AgentJwtService,
    private readonly agentService: AgentService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is missing');
    }

    try {
      const payload = this.agentJwtService.verifyAccessToken(token);

      // Attach agent payload; load referral code from DB so it's always current
      request['agent'] = payload;
      request['agentReferralCode'] =
        await this.agentService.getReferralCodeByProfileId(payload.agentId);
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

