import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GemCut } from '../../products/interfaces/product.interface';



export enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'inprogress',
  APPROVED = 'approved',
  CANCELLED = 'cancelled',
}

export type UserRequestDocument = UserRequest & Document;

@Schema({ timestamps: true })
export class UserRequest {
  @Prop({ required: true })
  image: string; 

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  category?: string;

  @Prop({ required: false })
  metal?: string;

  @Prop({ required: false })
  goldKarat?: string;

  @Prop({ required: false })
  stoneName?: string;

  @Prop({ enum: GemCut, required: false })
  stoneCut?: GemCut;

  @Prop({ required: false, type: String })
  stoneKarat?: string; 

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; 

  @Prop({ type: Types.ObjectId, ref: 'AgentProfile', required: false })
  agentRefId?: Types.ObjectId; 

  @Prop({ required: false })
  referralCode?: string;

  @Prop({ enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  @Prop()
  notes?: string;

  @Prop()
  completedAt?: Date;
}

export const UserRequestSchema = SchemaFactory.createForClass(UserRequest);

