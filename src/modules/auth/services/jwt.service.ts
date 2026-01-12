import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';


export interface TokenPayload {
  userId: string;
  sessionId?: string;
}

@Injectable()
export class JwtTokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly logger = new Logger(JwtTokenService.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshTokenSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessTokenExpiresIn =
      this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN');
    this.refreshTokenExpiresIn =
      this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN');

    this.logger.log('accessTokenSecret =', this.accessTokenSecret);
    this.logger.log('refreshTokenSecret =', this.refreshTokenSecret);
    this.logger.log('accessTokenExpiresIn =', this.accessTokenExpiresIn);
    this.logger.log('refreshTokenExpiresIn =', this.refreshTokenExpiresIn);
  }

  generateAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenExpiresIn,
    } as JwtSignOptions);
  }

  generateRefreshToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpiresIn,
    } as JwtSignOptions);
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.accessTokenSecret,
      });
      return payload as TokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.refreshTokenSecret,
      });
      return payload as TokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

