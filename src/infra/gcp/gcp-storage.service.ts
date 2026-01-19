import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IS3ObjectType, MimeTypes } from '../../modules/assets/interfaces/asset-s3-object.interface';

/**
 * GCP Storage Service for Google Cloud Storage operations
 * Note: You'll need to install @google-cloud/storage
 * Run: yarn add @google-cloud/storage
 *
 * Auth options (recommended order):
 * - GOOGLE_APPLICATION_CREDENTIALS_JSON: raw service account JSON (string)
 * - GOOGLE_APPLICATION_CREDENTIALS_BASE64: base64-encoded service account JSON
 * - GOOGLE_APPLICATION_CREDENTIALS: file path to service account JSON
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

      const hasInlineCreds =
        !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ||
        !!process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64?.trim();

      const storageOptions = this.getStorageOptionsFromEnv();
      
      // If inline creds were provided but all methods failed, fail fast
      if (hasInlineCreds && !storageOptions) {
        this.logger.error('❌ GCP credentials provided via env are invalid. Fix the env value and restart.');
        throw new Error(
          'Invalid GCP credentials in environment. Check GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS_BASE64',
        );
      }

      this.storage = storageOptions ? new Storage(storageOptions) : new Storage();
      this.bucket = this.storage.bucket(this.bucketName);
      this.logger.log('✅ GCP Storage client initialized');
    } catch (error: any) {
      const msg = String(error?.message || '');
      const hasInlineCreds =
        !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ||
        !!process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64?.trim();

      // If inline creds were provided but invalid, fail fast (don't silently fall back to public URLs)
      if (hasInlineCreds) {
        this.logger.error('❌ GCP credentials provided via env are invalid. Fix the env value and restart.');
        throw error;
      }

      // If module is missing, allow app to boot but signed URLs won't work
      if (error?.code === 'MODULE_NOT_FOUND' || msg.includes("Cannot find module '@google-cloud/storage'")) {
        this.logger.warn('⚠️ Signed URLs will not work without @google-cloud/storage. Objects must be public.');
        return;
      }

      // Any other error (e.g. missing credentials file path)
      this.logger.error('❌ Failed to initialize GCP Storage client:', error);
      this.logger.error(
        '   Make sure one of these is set correctly: GOOGLE_APPLICATION_CREDENTIALS_JSON, GOOGLE_APPLICATION_CREDENTIALS_BASE64, or GOOGLE_APPLICATION_CREDENTIALS (file path)',
      );
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
  ): Promise<{ url: string; key: string; expiresIn: number; requiredHeaders: Record<string, string> }> {
    const key = this.generateKey(fileName, refId, belongsTo);
    const expiresIn = 3600; // 1 hour
    const requiredHeaders: Record<string, string> = {
      'Content-Type': mimeType,
    };

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
        return { url, key, expiresIn, requiredHeaders };
      } catch (error: any) {
        this.logger.error(`Error generating signed upload URL for ${key}:`, error);
        
        // Provide more helpful error messages for common permission issues
        if (error?.code === 403 || error?.message?.includes('permission') || error?.message?.includes('Access denied')) {
          throw new BadRequestException(
            `Permission denied. The service account needs 'storage.objects.create' permission on bucket '${this.bucketName}'. ` +
            `Grant the 'Storage Object Creator' role to your service account in GCP Console.`,
          );
        }
        
        throw new BadRequestException(
          `Failed to generate signed upload URL: ${error?.message || 'Unknown error'}. Make sure you have proper permissions.`,
        );
      }
    }

    // Fallback: Return public URL (only works if bucket allows public uploads)
    this.logger.warn(
      `⚠️ GCP Storage SDK not available. Returning public URL. This may not work for private buckets.`,
    );
    const url = `${this.bucketUrl}/${key}`;
    return { url, key, expiresIn, requiredHeaders };
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
      } catch (error: any) {
        this.logger.error(`Error generating signed URL for ${key}:`, error);
        
        if (error?.code === 403 || error?.message?.includes('permission') || error?.message?.includes('Access denied')) {
          throw new BadRequestException(
            `Permission denied. The service account needs 'storage.objects.get' permission on bucket '${this.bucketName}'. ` +
            `Grant the 'Storage Object Viewer' or 'Storage Object Creator' role to your service account in GCP Console.`,
          );
        }
        
        throw new BadRequestException(
          `Failed to generate signed URL: ${error?.message || 'Unknown error'}. Make sure the object exists and you have proper permissions.`,
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
    } catch (error: any) {
      this.logger.error(`Error uploading file ${fileName}:`, error);
      
      if (error?.code === 403 || error?.message?.includes('permission') || error?.message?.includes('Access denied')) {
        throw new BadRequestException(
          `Permission denied. The service account needs 'storage.objects.create' permission on bucket '${this.bucketName}'. ` +
          `Grant the 'Storage Object Creator' role to your service account in GCP Console.`,
        );
      }
      
      throw new BadRequestException(
        `Failed to upload file: ${error?.message || 'Unknown error'}. Make sure you have proper permissions.`,
      );
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
      } catch (error: any) {
        this.logger.error(`Error deleting object ${key}:`, error);
        
        if (error?.code === 403 || error?.message?.includes('permission') || error?.message?.includes('Access denied')) {
          throw new BadRequestException(
            `Permission denied. The service account needs 'storage.objects.delete' permission on bucket '${this.bucketName}'. ` +
            `Grant the 'Storage Object Admin' or 'Storage Admin' role to your service account in GCP Console.`,
          );
        }
        
        throw new BadRequestException(
          `Failed to delete object: ${error?.message || 'Unknown error'}. Make sure you have proper permissions.`,
        );
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

  /**
   * Build GCP Storage client options from environment variables.
   * Supports credentials directly in env (JSON or base64) or via file path.
   */
  private getStorageOptionsFromEnv(): Record<string, any> | null {
    // 1) Raw JSON credentials in env
    const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
    if (json) {
      try {
        const credentials = JSON.parse(json);
        this.logger.log('🔐 Using GCP credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON');
        return { credentials };
      } catch (e: any) {
        // If JSON parsing fails, don't throw - fall through to check base64
        this.logger.warn('⚠️ Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON, trying other methods...');
      }
    }

    // 2) Base64 JSON credentials in env
    const b64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64?.trim();
    if (b64) {
      try {
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        const credentials = JSON.parse(decoded);
        this.logger.log('🔐 Using GCP credentials from GOOGLE_APPLICATION_CREDENTIALS_BASE64');
        return { credentials };
      } catch (e: any) {
        this.logger.error(
          '❌ Failed to decode/parse GOOGLE_APPLICATION_CREDENTIALS_BASE64 (must be base64-encoded service account JSON)',
        );
        // Don't throw here either - fall through to check file path
      }
    }

    // 3) File path (local/dev)
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    if (credentialsPath) {
      const path = require('path');
      const fs = require('fs');

      let resolvedPath = credentialsPath;
      if (!path.isAbsolute(credentialsPath)) {
        resolvedPath = path.resolve(process.cwd(), credentialsPath);
      }

      if (!fs.existsSync(resolvedPath)) {
        this.logger.error(`❌ GCP credentials file not found at: ${resolvedPath}`);
        this.logger.error(`   Original path from env: ${credentialsPath}`);
        this.logger.error(`   Current working directory: ${process.cwd()}`);
        throw new Error(`Credentials file not found: ${resolvedPath}`);
      }

      this.logger.log(`📁 Using GCP credentials from file: ${resolvedPath}`);
      return { keyFilename: resolvedPath };
    }

    return null;
  }
}
