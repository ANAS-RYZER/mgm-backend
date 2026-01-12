import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongodbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongodbService.name);

  constructor(@InjectConnection() private connection: Connection) {}

  onModuleInit() {
    // Check if already connected
    if (this.connection.readyState === 1) {
      const dbName = this.connection.db?.databaseName || 'unknown';
      const port = this.connection.port || 'unknown';
      const host = this.connection.host || 'unknown';
      this.logger.log(`✅ MongoDB connection successful - Host: ${host}, Port: ${port}, Database: ${dbName}`);
    }

    this.connection.on('connected', () => {
      const dbName = this.connection.db?.databaseName || 'unknown';
      const port = this.connection.port || 'unknown';
      const host = this.connection.host || 'unknown';
      this.logger.log(`✅ MongoDB connection successful - Host: ${host}, Port: ${port}, Database: ${dbName}`);
    });

    this.connection.on('error', (err) => {
      this.logger.error('❌ MongoDB error', err);
    });

    this.connection.on('disconnected', () => {
      this.logger.warn('⚠️ MongoDB disconnected');
    });

    this.connection.on('reconnected', () => {
      const dbName = this.connection.db?.databaseName || 'unknown';
      const port = this.connection.port || 'unknown';
      const host = this.connection.host || 'unknown';
      this.logger.log(`🔄 MongoDB reconnected - Host: ${host}, Port: ${port}, Database: ${dbName}`);
    });
  }

  async onModuleDestroy() {
    await this.connection.close();
    this.logger.log('MongoDB connection closed');
  }

  getConnection(): Connection {
    return this.connection;
  }

  getDb() {
    return this.connection.db;
  }
}

