import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

export interface AgentTokenPayload {
  agentId: string;
  email: string;
  sessionId?: string;
}

@Injectable()
export class AgentJwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly logger = new Logger(AgentJwtService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenSecret =
      this.configService.get<string>('AGENT_JWT_ACCESS_SECRET') ||'agent-access-secret';
    this.refreshTokenSecret =
      this.configService.get<string>('AGENT_JWT_REFRESH_SECRET') ||'agent-refresh-secret';
    this.accessTokenExpiresIn =
      this.configService.get<string>('AGENT_JWT_ACCESS_EXPIRES_IN') ||'15m';
    this.refreshTokenExpiresIn =
      this.configService.get<string>('AGENT_JWT_REFRESH_EXPIRES_IN') ||'7d';
  }

  generateAccessToken(payload: AgentTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenExpiresIn,
    } as JwtSignOptions);
  }

  generateRefreshToken(payload: AgentTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpiresIn,
    } as JwtSignOptions);
  }

  verifyAccessToken(token: string): AgentTokenPayload {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.accessTokenSecret,
      });
      return payload as AgentTokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): AgentTokenPayload {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.refreshTokenSecret,
      });
      return payload as AgentTokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

