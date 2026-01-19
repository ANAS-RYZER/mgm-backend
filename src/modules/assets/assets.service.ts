import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AssetS3Object, AssetS3ObjectDocument } from './schemas/asset-s3-object.schema';
import {
  IAssetS3Object,
  AssetS3ObjectQueryParams,
  IS3ObjectType,
  MimeTypes,
} from './interfaces/asset-s3-object.interface';
import { GcpStorageService } from '../../infra/gcp/gcp-storage.service';

@Injectable()
export class AssetsService {
  private readonly bucketName: string;

  constructor(
    @InjectModel(AssetS3Object.name)
    private assetS3ObjectModel: Model<AssetS3ObjectDocument>,
    private readonly gcpStorageService: GcpStorageService,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME') || '';
    if (!this.bucketName) {
      throw new Error(
        'AWS_BUCKET_NAME environment variable is required. Please set it in your .env file.',
      );
    }
  }

  /**
   * Create a new AssetS3Object record in the database
   */
  async create(objectData: Partial<IAssetS3Object>): Promise<IAssetS3Object> {
    const assetS3Object = new this.assetS3ObjectModel(objectData);
    const saved = await assetS3Object.save();
    return this.toPlainObject(saved);
  }

  /**
   * Convert Mongoose document to plain object with string _id
   */
  private toPlainObject(doc: AssetS3ObjectDocument): IAssetS3Object {
    const obj = doc.toObject();
    return {
      ...obj,
      _id: obj._id.toString(),
    } as IAssetS3Object;
  }

  /**
   * Retrieve an AssetS3Object by its ID
   */
  async getOneById(id: string): Promise<IAssetS3Object> {
    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid asset ID format: ${id}`);
    }

    const assetS3Object = await this.assetS3ObjectModel.findById(id);
    if (!assetS3Object) {
      throw new NotFoundException(
        `Asset S3 Object not found with ID: ${id}. Make sure the id is correct and the asset exists.`,
      );
    }
    return this.toPlainObject(assetS3Object);
  }

  /**
   * Generate a pre-signed upload URL and prepare the database record for single upload
   */
  async prepareSingleUpload(
    fileName: string,
    fileSize: number,
    mimeType: MimeTypes,
    refId: string,
    belongsTo: IS3ObjectType,
    isPublic: boolean = false,
    metadata: Record<string, any> = {},
  ): Promise<{
    uploadUrl: string;
    savedS3Object: IAssetS3Object;
    expiresIn: number;
    requiredHeaders: Record<string, string>;
  }> {
    // Validate the reference entity exists (basic validation - you may want to add actual entity checks)
    if (!Object.values(IS3ObjectType).includes(belongsTo)) {
      throw new BadRequestException(
        `Invalid belongsTo value, must be one of: ${Object.values(IS3ObjectType).join(', ')}`,
      );
    }

    // Generate presigned URL
    const { url, key: storageKey, expiresIn, requiredHeaders } =
      await this.gcpStorageService.getPresignedUploadUrl(
      fileName,
      mimeType,
      refId,
      belongsTo,
      metadata,
    );

    // Create asset record
    const savedS3Object = await this.create({
      refId,
      belongsTo,
      fileName,
      fileSize,
      mimeType,
      key: storageKey,
      bucket: this.bucketName,
      isPublic,
      metadata,
    });

    return {
      uploadUrl: url,
      savedS3Object,
      expiresIn,
      requiredHeaders,
    };
  }

  /**
   * Generate pre-signed upload URLs and prepare database records for bulk upload
   */
  async prepareBulkUpload(
    files: Array<{
      fileName: string;
      fileSize: number;
      mimeType: MimeTypes;
      refId: string;
      belongsTo: IS3ObjectType;
      isPublic?: boolean;
      metadata?: Record<string, any>;
    }>,
  ): Promise<Array<{
    uploadUrl: string;
    savedS3Object: IAssetS3Object;
    expiresIn: number;
  }>> {
    if (!Array.isArray(files) || files.length === 0) {
      throw new BadRequestException(
        "Invalid payload. Expected { files: [...] } with at least one item.",
      );
    }
    const results = await Promise.all(
      files.map((file) =>
        this.prepareSingleUpload(
          file.fileName,
          file.fileSize,
          file.mimeType,
          file.refId,
          file.belongsTo,
          file.isPublic || false,
          file.metadata || {},
        ),
      ),
    );

    return results;
  }

  /**
   * Get all AssetS3Objects by reference ID
   */
  async getAllByRefId(refId: string, belongsTo?: IS3ObjectType): Promise<IAssetS3Object[]> {
    const query: any = { refId };
    if (belongsTo) {
      query.belongsTo = belongsTo;
    }

    const assetS3Objects = await this.assetS3ObjectModel.find(query);
    if (assetS3Objects.length === 0) {
      throw new NotFoundException('No assets found for the given reference ID');
    }
    return assetS3Objects.map((obj) => this.toPlainObject(obj));
  }

  /**
   * Query AssetS3Objects with filtering and pagination
   */
  async query(filter: AssetS3ObjectQueryParams): Promise<IAssetS3Object[]> {
    const {
      refId,
      belongsTo,
      mimeType,
      isPublic,
      startDate,
      endDate,
      limit = 10,
      skip = 0,
    } = filter;

    const query: Record<string, any> = {};

    if (refId) query.refId = refId;
    if (belongsTo) query.belongsTo = belongsTo;
    if (mimeType) query.mimeType = mimeType;
    if (isPublic !== undefined) query.isPublic = isPublic;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const assets = await this.assetS3ObjectModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return assets.map((obj) => this.toPlainObject(obj));
  }

  /**
   * Delete an AssetS3Object by its ID
   */
  async delete(id: string): Promise<void> {
    const assetS3Object = await this.assetS3ObjectModel.findById(id);
    if (!assetS3Object) {
      throw new NotFoundException('Asset S3 Object not found, Make sure the id is correct');
    }

    await this.gcpStorageService.deleteObject(assetS3Object.key);
    await this.assetS3ObjectModel.findByIdAndDelete(id);
  }

  /**
   * Generate a pre-signed download URL
   */
  async getPresignedDownloadUrl(id: string): Promise<string> {
    const assetS3Object = await this.assetS3ObjectModel.findById(id);
    if (!assetS3Object) {
      throw new NotFoundException('Asset S3 Object not found, Make sure the id is correct');
    }

    return this.gcpStorageService.getPresignedDownloadUrl(assetS3Object.key);
  }

  /**
   * Get the permanent S3 URL for an asset
   */
  async getPermanentUrl(id: string): Promise<string> {
    const assetS3Object = await this.assetS3ObjectModel.findById(id);
    if (!assetS3Object) {
      throw new NotFoundException('Asset S3 Object not found, Make sure the id is correct');
    }

    return this.gcpStorageService.getPublicUrl(assetS3Object.key);
  }

  /**
   * Upload a file directly to GCP Storage and save metadata
   */
  async uploadFileDirectly(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    refId: string,
    belongsTo: IS3ObjectType,
    isPublic: boolean = false,
    metadata: Record<string, any> = {},
  ): Promise<IAssetS3Object> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate belongsTo
    if (!Object.values(IS3ObjectType).includes(belongsTo)) {
      throw new BadRequestException(
        `Invalid belongsTo value, must be one of: ${Object.values(IS3ObjectType).join(', ')}`,
      );
    }

    // Upload to GCP Storage
    const { key, publicUrl } = await this.gcpStorageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      refId,
      belongsTo,
      metadata,
    );

    // Create asset record
    const savedS3Object = await this.create({
      refId,
      belongsTo,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype as MimeTypes,
      key,
      bucket: this.bucketName,
      isPublic,
      metadata,
    });

    return savedS3Object;
  }
}
