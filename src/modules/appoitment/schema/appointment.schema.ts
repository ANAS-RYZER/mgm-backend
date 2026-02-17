import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

export enum SlotCode {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
}

export enum AppointmentStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  ISPURCHASED = 'ISPURCHASED',
  ISVISITED = 'ISVISITED',
}


@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

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

  @Prop({
  type: String,
  enum: AppointmentStatus,
  default: AppointmentStatus.CONFIRMED,
  })
  status: AppointmentStatus;


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
