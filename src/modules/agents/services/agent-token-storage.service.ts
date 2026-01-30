import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infra/redis/redis.service';

@Injectable()
export class AgentTokenStorageService {
  constructor(private readonly redisService: RedisService) {}

  private getSessionKey(sessionId: string): string {
    return `agent:session:${sessionId}`;
  }

  async storeTokens(
    sessionId: string,
    agentId: string,
    refreshToken: string,
    expiresIn: number = 7 * 24 * 60 * 60, // 7 days in seconds
  ): Promise<void> {
    const client = this.redisService.getClient();
    const sessionKey = this.getSessionKey(sessionId);

    // Store session data as hash
    await client.hset(
      sessionKey,
      'agentId',
      agentId,
      'refreshToken',
      refreshToken,
      'createdAt',
      Date.now().toString(),
    );

    // Set expiration on the session key
    await client.expire(sessionKey, expiresIn);
  }

  async getSessionData(sessionId: string): Promise<{
    agentId: string;
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
      agentId: sessionData.agentId,
      refreshToken: sessionData.refreshToken,
      createdAt: sessionData.createdAt,
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    const client = this.redisService.getClient();
    const sessionKey = this.getSessionKey(sessionId);
    await client.del(sessionKey);
  }

  async validateRefreshToken(
    sessionId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const sessionData = await this.getSessionData(sessionId);

    if (!sessionData) {
      return false;
    }

    return sessionData.refreshToken === refreshToken;
  }

  // Delete all sessions for an agent (useful for logout all devices)
  async deleteAllAgentSessions(agentId: string): Promise<void> {
    const client = this.redisService.getClient();
    const pattern = `agent:session:*`;
    const keys = await client.keys(pattern);

    for (const key of keys) {
      const sessionData = await client.hgetall(key);
      if (sessionData.agentId === agentId) {
        await client.del(key);
      }
    }
  }
}

