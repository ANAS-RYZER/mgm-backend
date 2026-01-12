import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IS3ObjectType, MimeTypes } from '../interfaces/asset-s3-object.interface';

export type AssetS3ObjectDocument = AssetS3Object & Document;

@Schema({ timestamps: true })
export class AssetS3Object {
  @Prop({ required: true })
  refId: string;

  @Prop({ required: true, enum: Object.values(IS3ObjectType) })
  belongsTo: IS3ObjectType;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop({ required: true, enum: Object.values(MimeTypes) })
  mimeType: MimeTypes;

  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  bucket: string;

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const AssetS3ObjectSchema = SchemaFactory.createForClass(AssetS3Object);
