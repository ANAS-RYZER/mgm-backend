import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppoitmenDatatService } from './appointment.data.service';
import {
  Appointment,
  AppointmentSchema,
} from '../schema/appointment.schema';
import { AppoitmentDataController } from './appointment.data.controller';
import { AgentModule } from '../../agents/agent.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    AgentModule
  ],
  controllers: [AppoitmentDataController],
  providers: [AppoitmenDatatService],
})
export class AppoitmentDataModule {}