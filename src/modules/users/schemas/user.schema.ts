import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName?: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password?: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ required: false })
  type?: string;

  @Prop({ required: true })
  refId: string;

  @Prop({ 
    type: String, 
    default: 'https://ryzer-v2.s3.ap-south-1.amazonaws.com/users/681c506bd81904bc923c7757/094fd3a1-3729-4f71-ad9f-86a74b1066be.png' 
  })
  avatar: string;

  createdAt?: Date;
  
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

