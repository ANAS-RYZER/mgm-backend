import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Price, PriceSchema } from './schemas/price.schema';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { AdminAuthModule } from '../admins/admin-auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Price.name, schema: PriceSchema }]),
    AdminAuthModule,
  ],
  controllers: [PriceController],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}

