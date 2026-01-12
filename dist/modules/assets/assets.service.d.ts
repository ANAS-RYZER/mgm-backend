import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AssetS3ObjectDocument } from './schemas/asset-s3-object.schema';
import { IAssetS3Object, AssetS3ObjectQueryParams, IS3ObjectType, MimeTypes } from './interfaces/asset-s3-object.interface';
import { GcpStorageService } from '../../infra/gcp/gcp-storage.service';
export declare class AssetsService {
    private assetS3ObjectModel;
    private readonly gcpStorageService;
    private readonly configService;
    private readonly bucketName;
    constructor(assetS3ObjectModel: Model<AssetS3ObjectDocument>, gcpStorageService: GcpStorageService, configService: ConfigService);
    create(objectData: Partial<IAssetS3Object>): Promise<IAssetS3Object>;
    private toPlainObject;
    getOneById(id: string): Promise<IAssetS3Object>;
    prepareSingleUpload(fileName: string, fileSize: number, mimeType: MimeTypes, refId: string, belongsTo: IS3ObjectType, isPublic?: boolean, metadata?: Record<string, any>): Promise<{
        uploadUrl: string;
        savedS3Object: IAssetS3Object;
        expiresIn: number;
    }>;
    prepareBulkUpload(files: Array<{
        fileName: string;
        fileSize: number;
        mimeType: MimeTypes;
        refId: string;
        belongsTo: IS3ObjectType;
        isPublic?: boolean;
        metadata?: Record<string, any>;
    }>): Promise<Array<{
        uploadUrl: string;
        savedS3Object: IAssetS3Object;
        expiresIn: number;
    }>>;
    getAllByRefId(refId: string, belongsTo?: IS3ObjectType): Promise<IAssetS3Object[]>;
    query(filter: AssetS3ObjectQueryParams): Promise<IAssetS3Object[]>;
    delete(id: string): Promise<void>;
    getPresignedDownloadUrl(id: string): Promise<string>;
    getPermanentUrl(id: string): Promise<string>;
    uploadFileDirectly(file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }, refId: string, belongsTo: IS3ObjectType, isPublic?: boolean, metadata?: Record<string, any>): Promise<IAssetS3Object>;
}
