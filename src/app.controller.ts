import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from './infra/redis/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    const mongoStatus = this.mongoConnection.readyState === 1 ? 'connected' : 'disconnected';
    const redisStatus = await this.checkRedisConnection();
    
    const health = {
      status: mongoStatus === 'connected' && redisStatus === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: {
          status: mongoStatus,
          database: this.mongoConnection.db?.databaseName || 'unknown',
        },
        redis: {
          status: redisStatus,
        },
      },
    };

    return health;
  }

  private async checkRedisConnection(): Promise<string> {
    try {
      const client = this.redisService.getClient();
      const result = await client.ping();
      return result === 'PONG' ? 'connected' : 'disconnected';
    } catch (error) {
      return 'disconnected';
    }
  }
}
 