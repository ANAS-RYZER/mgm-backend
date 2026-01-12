import { Injectable, Inject } from '@nestjs/common';
import { RedisService } from '../../../infra/redis/redis.service';

@Injectable()
export class TokenStorageService {
  constructor(private readonly redisService: RedisService) {}

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  async storeTokens(
    sessionId: string,
    userId: string,
    refreshToken: string,
    expiresIn: number = 7 * 24 * 60 * 60, // 7 days in seconds
  ): Promise<void> {
    const client = this.redisService.getClient();
    const sessionKey = this.getSessionKey(sessionId);

    // Store session data as hash
    await client.hset(
      sessionKey,
      'userId',
      userId,
      'refreshToken',
      refreshToken,
      'createdAt',
      Date.now().toString(),
    );

    // Set expiration on the session key
    await client.expire(sessionKey, expiresIn);
  }

  async getSessionData(sessionId: string): Promise<{
    userId: string;
    refreshToken: string;
    createdAt: string;
  } | null> {
    const client = this.redisService.getClient();
    const sessionKey = this.getSessionKey(sessionId);

    const sessionData = await client.hgetall(sessionKey);

    if (!sessionData || Object.keys(sessionData).length === 0) {
      return null;
    }

    return {
      userId: sessionData.userId,
      refreshToken: sessionData.refreshToken,
      createdAt: sessionData.createdAt,
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    const client = this.redisService.getClient();
    const sessionKey = this.getSessionKey(sessionId);
    await client.del(sessionKey);
  }

  async refreshSessionExpiry(
    sessionId: string,
    expiresIn: number = 7 * 24 * 60 * 60,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const sessionKey = this.getSessionKey(sessionId);
    await client.expire(sessionKey, expiresIn);
  }
}

