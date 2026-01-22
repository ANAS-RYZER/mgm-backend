import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true })
  fullName?: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password?: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: 'admin' })
  role?: string;

  @Prop({ 
    type: String, 
    default: 'https://ryzer-v2.s3.ap-south-1.amazonaws.com/users/681c506bd81904bc923c7757/094fd3a1-3729-4f71-ad9f-86a74b1066be.png' 
  })
  avatar: string;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

