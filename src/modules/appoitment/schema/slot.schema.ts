import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SlotDocument = Slot & Document;

@Schema({ timestamps: true })
export class Slot {
  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop({ required: true, enum: ['MORNING', 'EVENING', 'NIGHT'] })
  slotCode: string;

  @Prop({ default: 20 })
  maxBookings: number;

  @Prop({ default: 0 })
  bookedCount: number;
}

export const SlotSchema = SchemaFactory.createForClass(Slot);

// 🔒 Unique slot per date
SlotSchema.index({ date: 1, slotCode: 1 }, { unique: true });
