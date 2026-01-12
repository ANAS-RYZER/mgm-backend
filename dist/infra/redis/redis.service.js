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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = RedisService_1 = class RedisService {
    logger = new common_1.Logger(RedisService_1.name);
    client;
    constructor() {
        this.client = new ioredis_1.default({
            host: process.env.REDIS_HOST,
            port: 14233,
            username: 'default',
            password: process.env.REDIS_PASSWORD,
            tls: undefined,
        });
        console.log('REDIS_URL =', process.env.REDIS_URL);
        console.log('REDIS_HOST =', process.env.REDIS_HOST);
        console.log('REDIS_PORT =', process.env.REDIS_PORT);
        console.log('REDIS_USERNAME =', process.env.REDIS_USERNAME);
        console.log('REDIS_PASSWORD =', process.env.REDIS_PASSWORD);
        console.log('REDIS_TLS =', process.env.REDIS_TLS);
        this.client.on('connect', () => {
            this.logger.log('✅ Redis connected');
        });
        this.client.on('ready', () => {
            this.logger.log('🚀 Redis ready');
        });
        this.client.on('error', (err) => {
            this.logger.error('❌ Redis error', err);
        });
    }
    getClient() {
        return this.client;
    }
    async onModuleDestroy() {
        await this.client.quit();
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RedisService);
//# sourceMappingURL=redis.service.js.map