import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  CREATE_ORDER = 'create_order',
  ORDER_SUCCESS = 'order_success',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_FAILED = 'order_failed',
}


@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String,  required: false })
  agentId?: string

  // Multiple product SKUs
  @Prop({ type: [String], required: false })
  productSku?: string[];

  @Prop({ required: false })
  totalPrice?: number;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.CREATE_ORDER,
  })
  status: OrderStatus;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
