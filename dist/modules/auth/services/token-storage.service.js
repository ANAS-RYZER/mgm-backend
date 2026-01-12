"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenStorageService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../../infra/redis/redis.service");
let TokenStorageService = class TokenStorageService {
    redisService;
    constructor(redisService) {
        this.redisService = redisService;
    }
    getSessionKey(sessionId) {
        return `session:${sessionId}`;
    }
    async storeTokens(sessionId, userId, refreshToken, expiresIn = 7 * 24 * 60 * 60) {
        const client = this.redisService.getClient();
        const sessionKey = this.getSessionKey(sessionId);
        await client.hset(sessionKey, 'userId', userId, 'refreshToken', refreshToken, 'createdAt', Date.now().toString());
        await client.expire(sessionKey, expiresIn);
    }
    async getSessionData(sessionId) {
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
    async deleteSession(sessionId) {
        const client = this.redisService.getClient();
        const sessionKey = this.getSessionKey(sessionId);
        await client.del(sessionKey);
    }
    async refreshSessionExpiry(sessionId, expiresIn = 7 * 24 * 60 * 60) {
        const client = this.redisService.getClient();
        const sessionKey = this.getSessionKey(sessionId);
        await client.expire(sessionKey, expiresIn);
    }
};
exports.TokenStorageService = TokenStorageService;
exports.TokenStorageService = TokenStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], TokenStorageService);
//# sourceMappingURL=token-storage.service.js.map