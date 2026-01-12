import { Document } from 'mongoose';
import { IS3ObjectType, MimeTypes } from '../interfaces/asset-s3-object.interface';
export type AssetS3ObjectDocument = AssetS3Object & Document;
export declare class AssetS3Object {
    refId: string;
    belongsTo: IS3ObjectType;
    fileName: string;
    fileSize: number;
    mimeType: MimeTypes;
    key: string;
    bucket: string;
    isPublic: boolean;
    metadata?: Record<string, any>;
}
export declare const AssetS3ObjectSchema: import("mongoose").Schema<AssetS3Object, import("mongoose").Model<AssetS3Object, any, any, any, Document<unknown, any, AssetS3Object, any, {}> & AssetS3Object & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AssetS3Object, Document<unknown, {}, import("mongoose").FlatRecord<AssetS3Object>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<AssetS3Object> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
