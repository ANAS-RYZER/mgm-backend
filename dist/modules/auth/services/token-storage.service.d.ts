import { RedisService } from '../../../infra/redis/redis.service';
export declare class TokenStorageService {
    private readonly redisService;
    constructor(redisService: RedisService);
    private getSessionKey;
    storeTokens(sessionId: string, userId: string, refreshToken: string, expiresIn?: number): Promise<void>;
    getSessionData(sessionId: string): Promise<{
        userId: string;
        refreshToken: string;
        createdAt: string;
    } | null>;
    deleteSession(sessionId: string): Promise<void>;
    refreshSessionExpiry(sessionId: string, expiresIn?: number): Promise<void>;
}
