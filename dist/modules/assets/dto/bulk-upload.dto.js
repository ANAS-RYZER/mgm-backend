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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkUploadDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const asset_s3_object_interface_1 = require("../interfaces/asset-s3-object.interface");
class BulkUploadItemDto {
    fileName;
    fileSize;
    mimeType;
    refId;
    belongsTo;
    isPublic;
    metadata;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'File name is required' }),
    __metadata("design:type", String)
], BulkUploadItemDto.prototype, "fileName", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'File size is required' }),
    __metadata("design:type", Number)
], BulkUploadItemDto.prototype, "fileSize", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(asset_s3_object_interface_1.MimeTypes, { message: 'Invalid MIME type' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'MIME type is required' }),
    __metadata("design:type", String)
], BulkUploadItemDto.prototype, "mimeType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Reference ID is required' }),
    __metadata("design:type", String)
], BulkUploadItemDto.prototype, "refId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(asset_s3_object_interface_1.IS3ObjectType, { message: 'Invalid belongsTo value' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'belongsTo is required' }),
    __metadata("design:type", String)
], BulkUploadItemDto.prototype, "belongsTo", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], BulkUploadItemDto.prototype, "isPublic", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], BulkUploadItemDto.prototype, "metadata", void 0);
class BulkUploadDto {
    files;
}
exports.BulkUploadDto = BulkUploadDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'At least one file is required' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkUploadItemDto),
    __metadata("design:type", Array)
], BulkUploadDto.prototype, "files", void 0);
//# sourceMappingURL=bulk-upload.dto.js.map