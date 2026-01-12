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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const asset_s3_object_schema_1 = require("./schemas/asset-s3-object.schema");
const asset_s3_object_interface_1 = require("./interfaces/asset-s3-object.interface");
const gcp_storage_service_1 = require("../../infra/gcp/gcp-storage.service");
let AssetsService = class AssetsService {
    assetS3ObjectModel;
    gcpStorageService;
    configService;
    bucketName;
    constructor(assetS3ObjectModel, gcpStorageService, configService) {
        this.assetS3ObjectModel = assetS3ObjectModel;
        this.gcpStorageService = gcpStorageService;
        this.configService = configService;
        this.bucketName = this.configService.get('AWS_BUCKET_NAME') || '';
        if (!this.bucketName) {
            throw new Error('AWS_BUCKET_NAME environment variable is required. Please set it in your .env file.');
        }
    }
    async create(objectData) {
        const assetS3Object = new this.assetS3ObjectModel(objectData);
        const saved = await assetS3Object.save();
        return this.toPlainObject(saved);
    }
    toPlainObject(doc) {
        const obj = doc.toObject();
        return {
            ...obj,
            _id: obj._id.toString(),
        };
    }
    async getOneById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException(`Invalid asset ID format: ${id}`);
        }
        const assetS3Object = await this.assetS3ObjectModel.findById(id);
        if (!assetS3Object) {
            throw new common_1.NotFoundException(`Asset S3 Object not found with ID: ${id}. Make sure the id is correct and the asset exists.`);
        }
        return this.toPlainObject(assetS3Object);
    }
    async prepareSingleUpload(fileName, fileSize, mimeType, refId, belongsTo, isPublic = false, metadata = {}) {
        if (!Object.values(asset_s3_object_interface_1.IS3ObjectType).includes(belongsTo)) {
            throw new common_1.BadRequestException(`Invalid belongsTo value, must be one of: ${Object.values(asset_s3_object_interface_1.IS3ObjectType).join(', ')}`);
        }
        const { url, key: storageKey, expiresIn } = await this.gcpStorageService.getPresignedUploadUrl(fileName, mimeType, refId, belongsTo, metadata);
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
        };
    }
    async prepareBulkUpload(files) {
        const results = await Promise.all(files.map((file) => this.prepareSingleUpload(file.fileName, file.fileSize, file.mimeType, file.refId, file.belongsTo, file.isPublic || false, file.metadata || {})));
        return results;
    }
    async getAllByRefId(refId, belongsTo) {
        const query = { refId };
        if (belongsTo) {
            query.belongsTo = belongsTo;
        }
        const assetS3Objects = await this.assetS3ObjectModel.find(query);
        if (assetS3Objects.length === 0) {
            throw new common_1.NotFoundException('No assets found for the given reference ID');
        }
        return assetS3Objects.map((obj) => this.toPlainObject(obj));
    }
    async query(filter) {
        const { refId, belongsTo, mimeType, isPublic, startDate, endDate, limit = 10, skip = 0, } = filter;
        const query = {};
        if (refId)
            query.refId = refId;
        if (belongsTo)
            query.belongsTo = belongsTo;
        if (mimeType)
            query.mimeType = mimeType;
        if (isPublic !== undefined)
            query.isPublic = isPublic;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate)
                query.createdAt.$gte = startDate;
            if (endDate)
                query.createdAt.$lte = endDate;
        }
        const assets = await this.assetS3ObjectModel
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        return assets.map((obj) => this.toPlainObject(obj));
    }
    async delete(id) {
        const assetS3Object = await this.assetS3ObjectModel.findById(id);
        if (!assetS3Object) {
            throw new common_1.NotFoundException('Asset S3 Object not found, Make sure the id is correct');
        }
        await this.gcpStorageService.deleteObject(assetS3Object.key);
        await this.assetS3ObjectModel.findByIdAndDelete(id);
    }
    async getPresignedDownloadUrl(id) {
        const assetS3Object = await this.assetS3ObjectModel.findById(id);
        if (!assetS3Object) {
            throw new common_1.NotFoundException('Asset S3 Object not found, Make sure the id is correct');
        }
        return this.gcpStorageService.getPresignedDownloadUrl(assetS3Object.key);
    }
    async getPermanentUrl(id) {
        const assetS3Object = await this.assetS3ObjectModel.findById(id);
        if (!assetS3Object) {
            throw new common_1.NotFoundException('Asset S3 Object not found, Make sure the id is correct');
        }
        return this.gcpStorageService.getPublicUrl(assetS3Object.key);
    }
    async uploadFileDirectly(file, refId, belongsTo, isPublic = false, metadata = {}) {
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        if (!Object.values(asset_s3_object_interface_1.IS3ObjectType).includes(belongsTo)) {
            throw new common_1.BadRequestException(`Invalid belongsTo value, must be one of: ${Object.values(asset_s3_object_interface_1.IS3ObjectType).join(', ')}`);
        }
        const { key, publicUrl } = await this.gcpStorageService.uploadFile(file.buffer, file.originalname, file.mimetype, refId, belongsTo, metadata);
        const savedS3Object = await this.create({
            refId,
            belongsTo,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            key,
            bucket: this.bucketName,
            isPublic,
            metadata,
        });
        return savedS3Object;
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(asset_s3_object_schema_1.AssetS3Object.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        gcp_storage_service_1.GcpStorageService,
        config_1.ConfigService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map