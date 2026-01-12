import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsObject, IsNotEmpty } from 'class-validator';
import { IS3ObjectType, MimeTypes } from '../interfaces/asset-s3-object.interface';

export class SingleUploadDto {
  @IsString()
  @IsNotEmpty({ message: 'File name is required' })
  fileName: string;

  @IsNumber()
  @IsNotEmpty({ message: 'File size is required' })
  fileSize: number;

  @IsEnum(MimeTypes, { message: 'Invalid MIME type' })
  @IsNotEmpty({ message: 'MIME type is required' })
  mimeType: MimeTypes;

  @IsString()
  @IsNotEmpty({ message: 'Reference ID is required' })
  refId: string;

  @IsEnum(IS3ObjectType, { message: 'Invalid belongsTo value' })
  @IsNotEmpty({ message: 'belongsTo is required' })
  belongsTo: IS3ObjectType;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
