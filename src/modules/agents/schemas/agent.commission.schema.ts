import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AgentCommissionDocument = AgentCommission & Document;

@Schema({ timestamps: true })
export class AgentCommission {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AgentProfile', required: true })
  agentId: Types.ObjectId;

  @Prop({type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  referralCode: string;

  @Prop({ required: true })
  totalOrderAmount: number;

  @Prop({ required: true })
  commissionPercentage: number;

  @Prop({ required: true })
  commissionAmount: number;

  @Prop({ default: false })
  isPaid: boolean;
}

export const AgentCommissionSchema =
  SchemaFactory.createForClass(AgentCommission);

// Optional but recommended (prevent duplicate commission per order)
AgentCommissionSchema.index({ orderId: 1 }, { unique: true });
