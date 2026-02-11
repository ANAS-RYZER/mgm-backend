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
import { AppoitmentDataController } from './appoitmnetData/appointment.data.controller';
import {AppoitmenDatatService} from "./appoitmnetData/appointment.data.service"
import { AgentModule } from '../agents/agent.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Slot.name, schema: SlotSchema },
    ]),
    AuthModule,
    AgentModule,
  ],
  controllers: [AppoitmentController ,AppoitmentDataController ],
  providers: [AppoitmentService , AppoitmenDatatService],
})
export class AppoitmentModule {}