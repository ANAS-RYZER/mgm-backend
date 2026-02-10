import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
} from '../schema/appointment.schema';

@Injectable()
export class AppoitmenDatatService {

  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}

  async getAdminAppointment() {
    // Return all appointments ordered by date and slot start time (upcoming first)
    return this.appointmentModel
      .find()
      .sort({ date: 1, slotStartTime: 1 })
      .lean()
      .exec();
  }

 
  

}
