import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infra/redis/redis.service';

@Injectable()
export class AdminTokenStorageService {
  constructor(private readonly redisService: RedisService) {}

  private getAdminSessionKey(sessionId: string): string {
    return `admin:session:${sessionId}`;
  }

  async storeTokens(
    sessionId: string,
    adminId: string,
    refreshToken: string,
    expiresIn: number = 7 * 24 * 60 * 60, // 7 days in seconds
  ): Promise<void> {
    const client = this.redisService.getClient();
    const sessionKey = this.getAdminSessionKey(sessionId);

    // Store session data as hash
    await client.hset(
      sessionKey,
      'adminId',
      adminId,
      'refreshToken',
      refreshToken,
      'createdAt',
      Date.now().toString(),
    );

    // Set expiration on the session key
    await client.expire(sessionKey, expiresIn);
  }

  async getSessionData(sessionId: string): Promise<{
    adminId: string;
    refreshToken: string;
    createdAt: string;
  } | null> {
    const client = this.redisService.getClient();
    const sessionKey = this.getAdminSessionKey(sessionId);

    const sessionData = await client.hgetall(sessionKey);

    if (!sessionData || Object.keys(sessionData).length === 0) {
      return null;
    }

    return {
      adminId: sessionData.adminId,
      refreshToken: sessionData.refreshToken,
      createdAt: sessionData.createdAt,
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    const client = this.redisService.getClient();
    const sessionKey = this.getAdminSessionKey(sessionId);
    await client.del(sessionKey);
  }

  async refreshSessionExpiry(
    sessionId: string,
    expiresIn: number = 7 * 24 * 60 * 60,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const sessionKey = this.getAdminSessionKey(sessionId);
    await client.expire(sessionKey, expiresIn);
  }
}

