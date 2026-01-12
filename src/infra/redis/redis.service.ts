import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
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

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
