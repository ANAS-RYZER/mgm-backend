import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum MetalType {
  GOLD = 'gold',
  PLATINUM = 'platinum',
  SILVER = 'silver',
  DIAMOND = 'diamond',
}

export type PriceDocument = Price & Document;

@Schema({
  timestamps: true,
})
export class Price {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ enum: MetalType, required: true, lowercase: true })
  type: MetalType;

  createdAt: Date;

  updatedAt: Date;
}

export const PriceSchema = SchemaFactory.createForClass(Price);
