import { IS3ObjectType, MimeTypes } from '../interfaces/asset-s3-object.interface';
export declare class SingleUploadDto {
    fileName: string;
    fileSize: number;
    mimeType: MimeTypes;
    refId: string;
    belongsTo: IS3ObjectType;
    isPublic?: boolean;
    metadata?: Record<string, any>;
}
