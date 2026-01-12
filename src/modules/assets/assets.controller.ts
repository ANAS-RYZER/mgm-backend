import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
  Delete,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssetsService } from './assets.service';
import { SingleUploadDto } from './dto/single-upload.dto';
import { BulkUploadDto } from './dto/bulk-upload.dto';
import type { AssetS3ObjectQueryParams } from './interfaces/asset-s3-object.interface';
import { IS3ObjectType } from './interfaces/asset-s3-object.interface';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  /**
   * Single Image Upload
   * POST /assets/upload-single
   * 
   * Note: This endpoint generates a pre-signed upload URL.
   * The file should NOT be sent to this endpoint.
   * Instead, send JSON with file metadata, then upload the file to the returned URL.
   */
  @Post('upload-single')
  @HttpCode(HttpStatus.CREATED)
  async uploadSingle(@Body() singleUploadDto: SingleUploadDto) {
    console.log(singleUploadDto,'singleUploadDto');
    if (!singleUploadDto) {
      throw new BadRequestException(
        'Request body is required. Please send JSON (not form-data) with fileName, fileSize, mimeType, refId, and belongsTo fields.',
      );
    }

    const result = await this.assetsService.prepareSingleUpload(
      singleUploadDto.fileName,
      singleUploadDto.fileSize,
      singleUploadDto.mimeType,
      singleUploadDto.refId,
      singleUploadDto.belongsTo,
      singleUploadDto.isPublic,
      singleUploadDto.metadata,
    );

    return {
      message: 'Upload URL generated successfully',
      data: {
        uploadUrl: result.uploadUrl,
        assetS3Object: result.savedS3Object,
        expiresIn: result.expiresIn,
      },
    };
  }

  /**
   * Direct File Upload (form-data)
   * POST /assets/upload
   * 
   * Upload a file directly via form-data.
   * Form fields: file (required), refId (required), belongsTo (required), isPublic (optional)
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB max
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|pdf|mp4|webm)/i }),
        ],
      }),
    )
    file: any,
    @Body('refId') refId: string,
    @Body('belongsTo') belongsTo: string,
    @Body('isPublic') isPublic?: string,
    @Body('metadata') metadata?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!refId) {
      throw new BadRequestException('refId is required');
    }

    if (!belongsTo || !Object.values(IS3ObjectType).includes(belongsTo as IS3ObjectType)) {
      throw new BadRequestException(
        `belongsTo is required and must be one of: ${Object.values(IS3ObjectType).join(', ')}`,
      );
    }

    // Parse metadata if provided as JSON string
    let parsedMetadata: Record<string, any> = {};
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (error) {
        throw new BadRequestException('Invalid metadata format. Must be valid JSON.');
      }
    }

    const asset = await this.assetsService.uploadFileDirectly(
      file,
      refId,
      belongsTo as IS3ObjectType,
      isPublic === 'true',
      parsedMetadata,
    );

    return {
      message: 'File uploaded successfully',
      data: {
        assetS3Object: asset,
        url: await this.assetsService.getPermanentUrl(asset._id!),
      },
    };
  }

  /**
   * Bulk Image Upload
   * POST /assets/upload-bulk
   */
  @Post('upload-bulk')
  @HttpCode(HttpStatus.CREATED)
  async uploadBulk(@Body() bulkUploadDto: BulkUploadDto) {
    const results = await this.assetsService.prepareBulkUpload(bulkUploadDto.files);

    return {
      message: 'Upload URLs generated successfully',
      data: results.map((result) => ({
        uploadUrl: result.uploadUrl,
        assetS3Object: result.savedS3Object,
        expiresIn: result.expiresIn,
      })),
      count: results.length,
    };
  }

  /**
   * Get asset by ID
   * GET /assets/:id
   */
  @Get(':id')
  async getAssetById(@Param('id') id: string) {
    const asset = await this.assetsService.getOneById(id);
    return {
      message: 'Asset retrieved successfully',
      data: asset,
    };
  }

  /**
   * Get assets by reference ID
   * GET /assets/ref/:refId
   */
  @Get('ref/:refId')
  async getAssetsByRefId(@Param('refId') refId: string, @Query('belongsTo') belongsTo?: string) {
    const assets = await this.assetsService.getAllByRefId(refId, belongsTo as any);
    return {
      message: 'Assets retrieved successfully',
      data: assets,
      count: assets.length,
    };
  }

  /**
   * Query assets with filters
   * GET /assets
   */
  @Get()
  async queryAssets(@Query() query: AssetS3ObjectQueryParams) {
    const assets = await this.assetsService.query(query);
    return {
      message: 'Assets retrieved successfully',
      data: assets,
      count: assets.length,
    };
  }

  /**
   * Get pre-signed download URL by asset ID
   * GET /assets/:id/download-url
   */
  @Get(':id/download-url')
  async getDownloadUrl(@Param('id') id: string) {
    const url = await this.assetsService.getPresignedDownloadUrl(id);
    return {
      message: 'Download URL generated successfully',
      data: {
        url,
      },
    };
  }

  /**
   * Get pre-signed download URL by refId (convenience endpoint)
   * GET /assets/ref/:refId/download-url
   * Returns download URL for the most recent asset for a given refId
   */
  @Get('ref/:refId/download-url')
  async getDownloadUrlByRefId(
    @Param('refId') refId: string,
    @Query('belongsTo') belongsTo?: string,
  ) {
    const assets = await this.assetsService.getAllByRefId(refId, belongsTo as any);
    if (assets.length === 0) {
      throw new BadRequestException('No assets found for the given reference ID');
    }
    // Get the most recent asset
    const latestAsset = assets[0];
    const url = await this.assetsService.getPresignedDownloadUrl(latestAsset._id!);
    return {
      message: 'Download URL generated successfully',
      data: {
        url,
        assetId: latestAsset._id,
      },
    };
  }

  /**
   * Get permanent URL
   * GET /assets/:id/url
   */
  @Get(':id/url')
  async getPermanentUrl(@Param('id') id: string) {
    const url = await this.assetsService.getPermanentUrl(id);
    return {
      message: 'URL retrieved successfully',
      data: {
        url,
      },
    };
  }

  /**
   * Delete asset
   * DELETE /assets/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteAsset(@Param('id') id: string) {
    await this.assetsService.delete(id);
    return {
      message: 'Asset deleted successfully',
    };
  }
}
