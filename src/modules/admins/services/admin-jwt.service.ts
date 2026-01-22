import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

export interface AdminTokenPayload {
  adminId: string;
  sessionId?: string;
  role?: string;
}

export interface AdminVerificationTokenPayload {
  email: string;
  password: string;
  fullName?: string;
  type: string;
}

@Injectable()
export class AdminJwtTokenService {
  private readonly adminAccessTokenSecret: string;
  private readonly adminRefreshTokenSecret: string;
  private readonly adminAccessTokenExpiresIn: string;
  private readonly adminRefreshTokenExpiresIn: string;
  private readonly logger = new Logger(AdminJwtTokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.adminAccessTokenSecret =
      this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET') || 'admin-access-secret';
    this.adminRefreshTokenSecret =
      this.configService.get<string>('ADMIN_JWT_REFRESH_SECRET') || 'admin-refresh-secret';
    this.adminAccessTokenExpiresIn =
      this.configService.get<string>('ADMIN_JWT_ACCESS_EXPIRES_IN') || '15m';
    this.adminRefreshTokenExpiresIn =
      this.configService.get<string>('ADMIN_JWT_REFRESH_EXPIRES_IN') || '7d';

    this.logger.log('[ADMIN] adminAccessTokenSecret =', this.adminAccessTokenSecret);
    this.logger.log('[ADMIN] adminRefreshTokenSecret =', this.adminRefreshTokenSecret);
    this.logger.log('[ADMIN] adminAccessTokenExpiresIn =', this.adminAccessTokenExpiresIn);
    this.logger.log('[ADMIN] adminRefreshTokenExpiresIn =', this.adminRefreshTokenExpiresIn);
  }

  generateAccessToken(payload: AdminTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.adminAccessTokenSecret,
      expiresIn: this.adminAccessTokenExpiresIn,
    } as JwtSignOptions);
  }

  generateRefreshToken(payload: AdminTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.adminRefreshTokenSecret,
      expiresIn: this.adminRefreshTokenExpiresIn,
    } as JwtSignOptions);
  }

  generateVerificationToken(payload: AdminVerificationTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.adminAccessTokenSecret,
      expiresIn: '15m', // Verification token expires in 15 minutes
    } as JwtSignOptions);
  }

  verifyVerificationToken(token: string): AdminVerificationTokenPayload {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.adminAccessTokenSecret,
      });
      return payload as AdminVerificationTokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired admin verification token');
    }
  }

  verifyAccessToken(token: string): AdminTokenPayload {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.adminAccessTokenSecret,
      });
      return payload as AdminTokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired admin access token');
    }
  }

  verifyRefreshToken(token: string): AdminTokenPayload {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.adminRefreshTokenSecret,
      });
      return payload as AdminTokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired admin refresh token');
    }
  }

  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

