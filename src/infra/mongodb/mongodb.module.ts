import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongodbService } from './mongodb.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const mongodbUrl = configService.get<string>('MONGODB_URL') || 'mongodb+srv://Bhargav_Ryzer:Prod%40Ryzer1234@cluster0.e9hiwpb.mongodb.net/Ryzer_Staging';
        
        if (!mongodbUrl || mongodbUrl.trim() === '') {
          throw new Error('MONGODB_URL environment variable is required. Please set it in your .env file.');
        }

        return {
          uri: mongodbUrl,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          retryWrites: true,
          w: 'majority',
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MongodbService],
  exports: [MongodbService, MongooseModule],
})
export class MongodbModule {}

