import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { CreateAppointmentDto } from './dto/appoitment.dto';
import {
  Appointment,
  AppointmentDocument,
} from './schema/appointment.schema';
import { Slot, SlotDocument } from './schema/slot.schema';
import { SLOT_TIME_MAP } from './constant/time.slot';

@Injectable()
export class AppoitmentService {

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Slot.name)
    private readonly slotModel: Model<SlotDocument>,
  ) {}

  async getSlots(date: string) {
    const baseSlots = [
      { code: 'MORNING', time: '10:00 - 13:00' },
      { code: 'EVENING', time: '14:00 - 17:00' },
      { code: 'NIGHT', time: '17:30 - 20:30' },
    ];
  
    // 1️⃣ Fetch slot docs for the date
    const slotDocs = await this.slotModel.find({ date }).lean();
  
    // 2️⃣ Convert DB data to map
    const slotMap = new Map(
      slotDocs.map(slot => [slot.slotCode, slot.bookedCount]),
    );
  
    // 3️⃣ Merge DB + base slots
    return baseSlots.map(slot => {
      const bookedCount = slotMap.get(slot.code) || 0;
  
      return {
        slotCode: slot.code,
        time: slot.time,
        maxBookings: 20,
        bookedCount,
        availableCount: 20 - bookedCount,
        isAvailable: bookedCount < 20,
      };
    });
  }
  

  async createAppointment(dto: CreateAppointmentDto , userId) {
    const session = await this.connection.startSession();
    session.startTransaction();
  
    try {
      // 1️⃣ Increment slot only if space available
      const slot = await this.slotModel.findOneAndUpdate(
        {
          date: dto.date,
          slotCode: dto.slotCode,
          bookedCount: { $lt: 20 },
        },
        { $inc: { bookedCount: 1 } },
        { new: true, upsert: true, session },
      );
  
      if (!slot) {
        throw new Error('Slot is fully booked');
      }
  
      const slotTime = SLOT_TIME_MAP[dto.slotCode];
  
      // 2️⃣ Create appointment (store referralCode for agent filtering)
      const appointment = await this.appointmentModel.create(
        [
          {
            userId: userId,
            date: dto.date,
            slotCode: dto.slotCode,
            slotStartTime: slotTime.start,
            slotEndTime: slotTime.end,
            visitType: 'STORE',
            productIds: dto.productIds || [],
            status: 'CONFIRMED',
            ...(dto.referralCode && { referralCode: dto.referralCode }),
          },
        ],
        { session },
      );
  
      await session.commitTransaction();
      session.endSession();
  
      // 3️⃣ Notify admin
      this.notifyAdmin(appointment[0]);
  
      return {
        message: 'Appointment booked successfully',
        appointmentId: appointment[0]._id,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  

  notifyAdmin(appointment: any) {
    console.log('🔔 New Store Appointment', appointment);
    
  }
}
