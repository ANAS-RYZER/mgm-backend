import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppoitmentController } from './appointment.controller';
import { AppoitmentService } from './appointment.service';
import {
  Appointment,
  AppointmentSchema,
} from './schema/appointment.schema';
import { Slot, SlotSchema } from './schema/slot.schema';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Slot.name, schema: SlotSchema },
    ]),
    AuthModule,
  ],
  controllers: [AppoitmentController],
  providers: [AppoitmentService],
})
export class AppoitmentModule {}