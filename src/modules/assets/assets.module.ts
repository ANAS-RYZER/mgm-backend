import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetS3Object, AssetS3ObjectSchema } from './schemas/asset-s3-object.schema';
import { GcpStorageModule } from '../../infra/gcp/gcp-storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AssetS3Object.name, schema: AssetS3ObjectSchema }]),
    GcpStorageModule,
    ConfigModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
