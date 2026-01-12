import { ConfigService } from '@nestjs/config';
import { IS3ObjectType, MimeTypes } from '../../modules/assets/interfaces/asset-s3-object.interface';
export declare class GcpStorageService {
    private readonly configService;
    private readonly logger;
    private readonly bucketName;
    private readonly bucketUrl;
    private readonly endpoint;
    private storage;
    private bucket;
    constructor(configService: ConfigService);
    getPresignedUploadUrl(fileName: string, mimeType: MimeTypes, refId: string, belongsTo: IS3ObjectType, metadata?: Record<string, any>): Promise<{
        url: string;
        key: string;
        expiresIn: number;
    }>;
    getPresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
    getPublicUrl(key: string): string;
    uploadFile(buffer: Buffer, fileName: string, mimeType: string, refId: string, belongsTo: IS3ObjectType, metadata?: Record<string, any>): Promise<{
        key: string;
        publicUrl: string;
    }>;
    deleteObject(key: string): Promise<void>;
    private generateKey;
}
