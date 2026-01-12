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
exports.AssetS3ObjectSchema = exports.AssetS3Object = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const asset_s3_object_interface_1 = require("../interfaces/asset-s3-object.interface");
let AssetS3Object = class AssetS3Object {
    refId;
    belongsTo;
    fileName;
    fileSize;
    mimeType;
    key;
    bucket;
    isPublic;
    metadata;
};
exports.AssetS3Object = AssetS3Object;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AssetS3Object.prototype, "refId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(asset_s3_object_interface_1.IS3ObjectType) }),
    __metadata("design:type", String)
], AssetS3Object.prototype, "belongsTo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AssetS3Object.prototype, "fileName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], AssetS3Object.prototype, "fileSize", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(asset_s3_object_interface_1.MimeTypes) }),
    __metadata("design:type", String)
], AssetS3Object.prototype, "mimeType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], AssetS3Object.prototype, "key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AssetS3Object.prototype, "bucket", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], AssetS3Object.prototype, "isPublic", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], AssetS3Object.prototype, "metadata", void 0);
exports.AssetS3Object = AssetS3Object = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], AssetS3Object);
exports.AssetS3ObjectSchema = mongoose_1.SchemaFactory.createForClass(AssetS3Object);
//# sourceMappingURL=asset-s3-object.schema.js.map