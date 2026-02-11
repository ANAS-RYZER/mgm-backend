import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

export enum SlotCode {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
}

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ required: true })
  userId: string;


  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop({ required: true, enum: SlotCode })
  slotCode: SlotCode;

  @Prop({ required: true })
  slotStartTime: string;

  @Prop({ required: true })
  slotEndTime: string;

  @Prop({ default: 'STORE' })
  visitType: string;

  @Prop({ type: [String], default: [] })
  productIds: string[];

  @Prop({ default: 'CONFIRMED' })
  status: 'CONFIRMED' | 'CANCELLED';

  @Prop()
  referralCode?: string;

  @Prop()
  agentId?: string;

  // Backwards-compat: some existing documents use `agentid`
  @Prop()
  agentid?: string;
}


export const AppointmentSchema =
  SchemaFactory.createForClass(Appointment);
