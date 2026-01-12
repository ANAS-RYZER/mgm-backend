import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IS3ObjectType, MimeTypes } from '../../modules/assets/interfaces/asset-s3-object.interface';

/**
 * GCP Storage Service for Google Cloud Storage operations
 * Note: You'll need to install @google-cloud/storage
 * Run: yarn add @google-cloud/storage
 */
@Injectable()
export class GcpStorageService {
  private readonly logger = new Logger(GcpStorageService.name);
  private readonly bucketName: string;
  private readonly bucketUrl: string;
  private readonly endpoint: string;
  private storage: any;
  private bucket: any;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME') || '';
    this.bucketUrl = this.configService.get<string>('AWS_BUCKET_URL') || '';
    this.endpoint = this.configService.get<string>('AWS_S3_ENDPOINT') || 'https://storage.googleapis.com';

    // Try to initialize GCP Storage client if SDK is available
    try {
      // Dynamic import to avoid errors if package is not installed
      const { Storage } = require('@google-cloud/storage');
      
      // Check if credentials path is set and resolve it
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (credentialsPath) {
        const path = require('path');
        const fs = require('fs');
        
        // If path is relative, resolve it from project root
        let resolvedPath = credentialsPath;
        if (!path.isAbsolute(credentialsPath)) {
          resolvedPath = path.resolve(process.cwd(), credentialsPath);
        }
        
        // Check if file exists
        if (!fs.existsSync(resolvedPath)) {
          this.logger.error(
            `❌ GCP credentials file not found at: ${resolvedPath}`,
          );
          this.logger.error(
            `   Original path from env: ${credentialsPath}`,
          );
          this.logger.error(
            `   Current working directory: ${process.cwd()}`,
          );
          throw new Error(`Credentials file not found: ${resolvedPath}`);
        }
        
        this.logger.log(`📁 Using GCP credentials from: ${resolvedPath}`);
      }
      
      this.storage = new Storage();
      this.bucket = this.storage.bucket(this.bucketName);
      this.logger.log('✅ GCP Storage client initialized');
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        this.logger.warn(
          '⚠️ @google-cloud/storage package not found. Install it with: yarn add @google-cloud/storage',
        );
        this.logger.warn('⚠️ Signed URLs will not work without the SDK. Objects must be public.');
      } else {
        this.logger.error('❌ Failed to initialize GCP Storage client:', error.message);
        this.logger.error('   Make sure GOOGLE_APPLICATION_CREDENTIALS points to a valid service account JSON file');
      }
    }
  }

  /**
   * Generate a pre-signed upload URL
   */
  async getPresignedUploadUrl(
    fileName: string,
    mimeType: MimeTypes,
    refId: string,
    belongsTo: IS3ObjectType,
    metadata: Record<string, any> = {},
  ): Promise<{ url: string; key: string; expiresIn: number }> {
    const key = this.generateKey(fileName, refId, belongsTo);
    const expiresIn = 3600; // 1 hour

    // Use GCP Storage SDK if available
    if (this.bucket) {
      try {
        const file = this.bucket.file(key);
        const [url] = await file.getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + expiresIn * 1000,
          contentType: mimeType,
          extensionHeaders: metadata,
        });
        return { url, key, expiresIn };
      } catch (error) {
        this.logger.error(`Error generating signed upload URL for ${key}:`, error);
        throw new BadRequestException(
          `Failed to generate signed upload URL. Make sure you have proper permissions.`,
        );
      }
    }

    // Fallback: Return public URL (only works if bucket allows public uploads)
    this.logger.warn(
      `⚠️ GCP Storage SDK not available. Returning public URL. This may not work for private buckets.`,
    );
    const url = `${this.bucketUrl}/${key}`;
    return { url, key, expiresIn };
  }

  /**
   * Generate a pre-signed download URL
   */
  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Use GCP Storage SDK if available
    if (this.bucket) {
      try {
        const file = this.bucket.file(key);
        const [url] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + expiresIn * 1000,
        });
        return url;
      } catch (error) {
        this.logger.error(`Error generating signed URL for ${key}:`, error);
        throw new BadRequestException(
          `Failed to generate signed URL. Make sure the object exists and you have proper permissions.`,
        );
      }
    }

    // Fallback: Return public URL (only works if object is public)
    this.logger.warn(
      `⚠️ GCP Storage SDK not available. Returning public URL. Object must be public for this to work.`,
    );
    return `${this.bucketUrl}/${key}`;
  }

  /**
   * Get public URL for a GCP Storage object
   */
  getPublicUrl(key: string): string {
    if (this.bucketUrl) {
      return `${this.bucketUrl}/${key}`;
    }
    if (this.bucketName) {
      return `${this.endpoint}/${this.bucketName}/${key}`;
    }
    return key;
  }

  /**
   * Upload a file directly to GCP Storage
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    refId: string,
    belongsTo: IS3ObjectType,
    metadata: Record<string, any> = {},
  ): Promise<{ key: string; publicUrl: string }> {
    if (!this.bucket) {
      throw new BadRequestException(
        'GCP Storage SDK not available. Please install @google-cloud/storage and configure credentials.',
      );
    }

    try {
      const key = this.generateKey(fileName, refId, belongsTo);
      const file = this.bucket.file(key);

      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
          metadata: metadata,
        },
        public: false, // Keep files private by default
      });

      this.logger.log(`✅ File uploaded successfully: ${key}`);
      return {
        key,
        publicUrl: this.getPublicUrl(key),
      };
    } catch (error) {
      this.logger.error(`Error uploading file ${fileName}:`, error);
      throw new BadRequestException(`Failed to upload file. Make sure you have proper permissions.`);
    }
  }

  /**
   * Delete an object from GCP Storage
   */
  async deleteObject(key: string): Promise<void> {
    if (this.bucket) {
      try {
        const file = this.bucket.file(key);
        await file.delete();
        this.logger.log(`✅ Deleted object: ${key}`);
      } catch (error) {
        this.logger.error(`Error deleting object ${key}:`, error);
        throw new BadRequestException(`Failed to delete object. Make sure you have proper permissions.`);
      }
    } else {
      this.logger.warn(`⚠️ GCP Storage SDK not available. Cannot delete object: ${key}`);
    }
  }

  /**
   * Generate GCP Storage key for an object
   */
  private generateKey(fileName: string, refId: string, belongsTo: IS3ObjectType): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${belongsTo}/${refId}/${timestamp}-${sanitizedFileName}`;
  }
}
