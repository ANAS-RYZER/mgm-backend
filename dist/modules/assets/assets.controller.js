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
exports.AssetsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const assets_service_1 = require("./assets.service");
const single_upload_dto_1 = require("./dto/single-upload.dto");
const bulk_upload_dto_1 = require("./dto/bulk-upload.dto");
const asset_s3_object_interface_1 = require("./interfaces/asset-s3-object.interface");
let AssetsController = class AssetsController {
    assetsService;
    constructor(assetsService) {
        this.assetsService = assetsService;
    }
    async uploadSingle(singleUploadDto) {
        console.log(singleUploadDto, 'singleUploadDto');
        if (!singleUploadDto) {
            throw new common_1.BadRequestException('Request body is required. Please send JSON (not form-data) with fileName, fileSize, mimeType, refId, and belongsTo fields.');
        }
        const result = await this.assetsService.prepareSingleUpload(singleUploadDto.fileName, singleUploadDto.fileSize, singleUploadDto.mimeType, singleUploadDto.refId, singleUploadDto.belongsTo, singleUploadDto.isPublic, singleUploadDto.metadata);
        return {
            message: 'Upload URL generated successfully',
            data: {
                uploadUrl: result.uploadUrl,
                assetS3Object: result.savedS3Object,
                expiresIn: result.expiresIn,
            },
        };
    }
    async uploadFile(file, refId, belongsTo, isPublic, metadata) {
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        if (!refId) {
            throw new common_1.BadRequestException('refId is required');
        }
        if (!belongsTo || !Object.values(asset_s3_object_interface_1.IS3ObjectType).includes(belongsTo)) {
            throw new common_1.BadRequestException(`belongsTo is required and must be one of: ${Object.values(asset_s3_object_interface_1.IS3ObjectType).join(', ')}`);
        }
        let parsedMetadata = {};
        if (metadata) {
            try {
                parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
            }
            catch (error) {
                throw new common_1.BadRequestException('Invalid metadata format. Must be valid JSON.');
            }
        }
        const asset = await this.assetsService.uploadFileDirectly(file, refId, belongsTo, isPublic === 'true', parsedMetadata);
        return {
            message: 'File uploaded successfully',
            data: {
                assetS3Object: asset,
                url: await this.assetsService.getPermanentUrl(asset._id),
            },
        };
    }
    async uploadBulk(bulkUploadDto) {
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
    async getAssetById(id) {
        const asset = await this.assetsService.getOneById(id);
        return {
            message: 'Asset retrieved successfully',
            data: asset,
        };
    }
    async getAssetsByRefId(refId, belongsTo) {
        const assets = await this.assetsService.getAllByRefId(refId, belongsTo);
        return {
            message: 'Assets retrieved successfully',
            data: assets,
            count: assets.length,
        };
    }
    async queryAssets(query) {
        const assets = await this.assetsService.query(query);
        return {
            message: 'Assets retrieved successfully',
            data: assets,
            count: assets.length,
        };
    }
    async getDownloadUrl(id) {
        const url = await this.assetsService.getPresignedDownloadUrl(id);
        return {
            message: 'Download URL generated successfully',
            data: {
                url,
            },
        };
    }
    async getDownloadUrlByRefId(refId, belongsTo) {
        const assets = await this.assetsService.getAllByRefId(refId, belongsTo);
        if (assets.length === 0) {
            throw new common_1.BadRequestException('No assets found for the given reference ID');
        }
        const latestAsset = assets[0];
        const url = await this.assetsService.getPresignedDownloadUrl(latestAsset._id);
        return {
            message: 'Download URL generated successfully',
            data: {
                url,
                assetId: latestAsset._id,
            },
        };
    }
    async getPermanentUrl(id) {
        const url = await this.assetsService.getPermanentUrl(id);
        return {
            message: 'URL retrieved successfully',
            data: {
                url,
            },
        };
    }
    async deleteAsset(id) {
        await this.assetsService.delete(id);
        return {
            message: 'Asset deleted successfully',
        };
    }
};
exports.AssetsController = AssetsController;
__decorate([
    (0, common_1.Post)('upload-single'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [single_upload_dto_1.SingleUploadDto]),
    __metadata("design:returntype", Promise)
], AssetsController.prototype, "uploadSingle", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
            new common_1.FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|pdf|mp4|webm)/i }),
        ],
    }))),
    __param(1, (0, common_1.Body)('refId')),
    __param(2, (0, common_1.Body)('belongsTo')),
    __param(3, (0, common_1.Body)('isPublic')),
    __param(4, (0, common_1.Body)('metadata')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AssetsController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Post)('upload-bulk'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_upload_dto_1.BulkUploadDto]),
    __metadata("design:returntype", Promise)
], AssetsController.prototype, "uploadBulk", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AssetsController.prototype, "getAssetById", null);
__decorate([
    (0, common_1.Get)('ref/:refId'),
    __param(0, (0, common_1.Param)('refId')),
    __param(1, (0, common_1.Query)('belongsTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AssetsController.prototype, "getAssetsByRefId", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AssetsController.prototype, "queryAssets", null);
__decorate([
    (0, common_1.Get)(':id/download-url'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AssetsController.prototype, "getDownloadUrl", null);
__decorate([
    (0, common_1.Get)('ref/:refId/download-url'),
    __param(0, (0, common_1.Param)('refId')),
    __param(1, (0, common_1.Query)('belongsTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AssetsController.prototype, "getDownloadUrlByRefId", null);
__decorate([
    (0, common_1.Get)(':id/url'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AssetsController.prototype, "getPermanentUrl", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AssetsController.prototype, "deleteAsset", null);
exports.AssetsController = AssetsController = __decorate([
    (0, common_1.Controller)('assets'),
    __metadata("design:paramtypes", [assets_service_1.AssetsService])
], AssetsController);
//# sourceMappingURL=assets.controller.js.map