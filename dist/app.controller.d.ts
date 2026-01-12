import { AppService } from './app.service';
import { Connection } from 'mongoose';
import { RedisService } from './infra/redis/redis.service';
export declare class AppController {
    private readonly appService;
    private readonly mongoConnection;
    private readonly redisService;
    constructor(appService: AppService, mongoConnection: Connection, redisService: RedisService);
    getHello(): string;
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        services: {
            mongodb: {
                status: string;
                database: string;
            };
            redis: {
                status: string;
            };
        };
    }>;
    private checkRedisConnection;
}
