"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GcpStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GcpStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let GcpStorageService = GcpStorageService_1 = class GcpStorageService {
    configService;
    logger = new common_1.Logger(GcpStorageService_1.name);
    bucketName;
    bucketUrl;
    endpoint;
    storage;
    bucket;
    constructor(configService) {
        this.configService = configService;
        this.bucketName = this.configService.get('AWS_BUCKET_NAME') || '';
        this.bucketUrl = this.configService.get('AWS_BUCKET_URL') || '';
        this.endpoint = this.configService.get('AWS_S3_ENDPOINT') || 'https://storage.googleapis.com';
        try {
            const { Storage } = require('@google-cloud/storage');
            const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
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
                this.logger.log(`📁 Using GCP credentials from: ${resolvedPath}`);
            }
            this.storage = new Storage();
            this.bucket = this.storage.bucket(this.bucketName);
            this.logger.log('✅ GCP Storage client initialized');
        }
        catch (error) {
            if (error.message && error.message.includes('not found')) {
                this.logger.warn('⚠️ @google-cloud/storage package not found. Install it with: yarn add @google-cloud/storage');
                this.logger.warn('⚠️ Signed URLs will not work without the SDK. Objects must be public.');
            }
            else {
                this.logger.error('❌ Failed to initialize GCP Storage client:', error.message);
                this.logger.error('   Make sure GOOGLE_APPLICATION_CREDENTIALS points to a valid service account JSON file');
            }
        }
    }
    async getPresignedUploadUrl(fileName, mimeType, refId, belongsTo, metadata = {}) {
        const key = this.generateKey(fileName, refId, belongsTo);
        const expiresIn = 3600;
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
            }
            catch (error) {
                this.logger.error(`Error generating signed upload URL for ${key}:`, error);
                throw new common_1.BadRequestException(`Failed to generate signed upload URL. Make sure you have proper permissions.`);
            }
        }
        this.logger.warn(`⚠️ GCP Storage SDK not available. Returning public URL. This may not work for private buckets.`);
        const url = `${this.bucketUrl}/${key}`;
        return { url, key, expiresIn };
    }
    async getPresignedDownloadUrl(key, expiresIn = 3600) {
        if (this.bucket) {
            try {
                const file = this.bucket.file(key);
                const [url] = await file.getSignedUrl({
                    version: 'v4',
                    action: 'read',
                    expires: Date.now() + expiresIn * 1000,
                });
                return url;
            }
            catch (error) {
                this.logger.error(`Error generating signed URL for ${key}:`, error);
                throw new common_1.BadRequestException(`Failed to generate signed URL. Make sure the object exists and you have proper permissions.`);
            }
        }
        this.logger.warn(`⚠️ GCP Storage SDK not available. Returning public URL. Object must be public for this to work.`);
        return `${this.bucketUrl}/${key}`;
    }
    getPublicUrl(key) {
        if (this.bucketUrl) {
            return `${this.bucketUrl}/${key}`;
        }
        if (this.bucketName) {
            return `${this.endpoint}/${this.bucketName}/${key}`;
        }
        return key;
    }
    async uploadFile(buffer, fileName, mimeType, refId, belongsTo, metadata = {}) {
        if (!this.bucket) {
            throw new common_1.BadRequestException('GCP Storage SDK not available. Please install @google-cloud/storage and configure credentials.');
        }
        try {
            const key = this.generateKey(fileName, refId, belongsTo);
            const file = this.bucket.file(key);
            await file.save(buffer, {
                metadata: {
                    contentType: mimeType,
                    metadata: metadata,
                },
                public: false,
            });
            this.logger.log(`✅ File uploaded successfully: ${key}`);
            return {
                key,
                publicUrl: this.getPublicUrl(key),
            };
        }
        catch (error) {
            this.logger.error(`Error uploading file ${fileName}:`, error);
            throw new common_1.BadRequestException(`Failed to upload file. Make sure you have proper permissions.`);
        }
    }
    async deleteObject(key) {
        if (this.bucket) {
            try {
                const file = this.bucket.file(key);
                await file.delete();
                this.logger.log(`✅ Deleted object: ${key}`);
            }
            catch (error) {
                this.logger.error(`Error deleting object ${key}:`, error);
                throw new common_1.BadRequestException(`Failed to delete object. Make sure you have proper permissions.`);
            }
        }
        else {
            this.logger.warn(`⚠️ GCP Storage SDK not available. Cannot delete object: ${key}`);
        }
    }
    generateKey(fileName, refId, belongsTo) {
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `${belongsTo}/${refId}/${timestamp}-${sanitizedFileName}`;
    }
};
exports.GcpStorageService = GcpStorageService;
exports.GcpStorageService = GcpStorageService = GcpStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GcpStorageService);
//# sourceMappingURL=gcp-storage.service.js.map