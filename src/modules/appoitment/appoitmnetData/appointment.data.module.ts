import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppoitmenDatatService } from './appointment.data.service';
import {
  Appointment,
  AppointmentSchema,
} from '../schema/appointment.schema';
import { AppoitmentDataController } from './appointment.data.controller';
import { AgentModule } from '../../agents/agent.module';
import { UsersModule } from '../../users/users.module';
import { ProductsModule } from '../../products/products.module';
import {AdminAuthModule} from "../../admins/admin-auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    AgentModule,
    UsersModule,
    ProductsModule,
    AdminAuthModule,
  ],
  controllers: [AppoitmentDataController],
  providers: [AppoitmenDatatService],
})
export class AppoitmentDataModule {}