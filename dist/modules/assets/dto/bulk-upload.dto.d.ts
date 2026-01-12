import { IS3ObjectType, MimeTypes } from '../interfaces/asset-s3-object.interface';
declare class BulkUploadItemDto {
    fileName: string;
    fileSize: number;
    mimeType: MimeTypes;
    refId: string;
    belongsTo: IS3ObjectType;
    isPublic?: boolean;
    metadata?: Record<string, any>;
}
export declare class BulkUploadDto {
    files: BulkUploadItemDto[];
}
export {};
