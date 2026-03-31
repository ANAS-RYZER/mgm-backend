import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  CREATE_ORDER = 'create_order',
  ORDER_SUCCESS = 'order_success',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_FAILED = 'order_failed',
}

@Schema({ _id: false }) // important: prevents creating separate _id for subdocument
export class Breakdown {
  @Prop({ required: false })
  basePriceTotal?: number;

  @Prop({ required: false })
  vaTotal?: number;

  @Prop({ required: false })
  makingTotal?: number;

  @Prop({ required: false })
  grossTotal?: number;

  @Prop({ required: false })
  discountTotal?: number;

  @Prop({ required: false })
  taxableTotal?: number;

  @Prop({ required: false })
  cgstTotal?: number;

  @Prop({ required: false })
  sgstTotal?: number;

  @Prop({ required: false })
  grandTotal?: number;

  @Prop({ required: false })
  commission?: number;

  @Prop({ required: false })
  adminRevenue?: number;
}

export const BreakdownSchema = SchemaFactory.createForClass(Breakdown);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: false })
  agentId?: string;

  @Prop({ type: [String], required: false })
  productSku?: string[];

  @Prop({ required: false })
  totalPrice?: number;

  // ADD THIS
  @Prop({ type: BreakdownSchema, required: false })
  breakdown?: Breakdown;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.CREATE_ORDER,
  })
  status: OrderStatus;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
