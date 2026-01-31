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
        requiredHeaders: result.requiredHeaders,
        assetS3Object: result.savedS3Object,
        expiresIn: result.expiresIn,
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
   * Get pre-signed download URL by asset ID
   * GET /assets/:id/download-url
   */

  /**
   * Get pre-signed download URL by refId (convenience endpoint)
   * GET /assets/ref/:refId/download-url
   * Returns download URL for the most recent asset for a given refId
  /*
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
