import { AssetsService } from './assets.service';
import { SingleUploadDto } from './dto/single-upload.dto';
import { BulkUploadDto } from './dto/bulk-upload.dto';
import type { AssetS3ObjectQueryParams } from './interfaces/asset-s3-object.interface';
export declare class AssetsController {
    private readonly assetsService;
    constructor(assetsService: AssetsService);
    uploadSingle(singleUploadDto: SingleUploadDto): Promise<{
        message: string;
        data: {
            uploadUrl: string;
            assetS3Object: import("./interfaces/asset-s3-object.interface").IAssetS3Object;
            expiresIn: number;
        };
    }>;
    uploadFile(file: any, refId: string, belongsTo: string, isPublic?: string, metadata?: string): Promise<{
        message: string;
        data: {
            assetS3Object: import("./interfaces/asset-s3-object.interface").IAssetS3Object;
            url: string;
        };
    }>;
    uploadBulk(bulkUploadDto: BulkUploadDto): Promise<{
        message: string;
        data: {
            uploadUrl: string;
            assetS3Object: import("./interfaces/asset-s3-object.interface").IAssetS3Object;
            expiresIn: number;
        }[];
        count: number;
    }>;
    getAssetById(id: string): Promise<{
        message: string;
        data: import("./interfaces/asset-s3-object.interface").IAssetS3Object;
    }>;
    getAssetsByRefId(refId: string, belongsTo?: string): Promise<{
        message: string;
        data: import("./interfaces/asset-s3-object.interface").IAssetS3Object[];
        count: number;
    }>;
    queryAssets(query: AssetS3ObjectQueryParams): Promise<{
        message: string;
        data: import("./interfaces/asset-s3-object.interface").IAssetS3Object[];
        count: number;
    }>;
    getDownloadUrl(id: string): Promise<{
        message: string;
        data: {
            url: string;
        };
    }>;
    getDownloadUrlByRefId(refId: string, belongsTo?: string): Promise<{
        message: string;
        data: {
            url: string;
            assetId: string | undefined;
        };
    }>;
    getPermanentUrl(id: string): Promise<{
        message: string;
        data: {
            url: string;
        };
    }>;
    deleteAsset(id: string): Promise<{
        message: string;
    }>;
}
