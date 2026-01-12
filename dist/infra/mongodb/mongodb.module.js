"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongodbModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongodb_service_1 = require("./mongodb.service");
let MongodbModule = class MongodbModule {
};
exports.MongodbModule = MongodbModule;
exports.MongodbModule = MongodbModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => {
                    const mongodbUrl = configService.get('MONGODB_URL') || 'mongodb+srv://Bhargav_Ryzer:Prod%40Ryzer1234@cluster0.e9hiwpb.mongodb.net/Ryzer_Staging';
                    if (!mongodbUrl || mongodbUrl.trim() === '') {
                        throw new Error('MONGODB_URL environment variable is required. Please set it in your .env file.');
                    }
                    return {
                        uri: mongodbUrl,
                        maxPoolSize: 10,
                        serverSelectionTimeoutMS: 5000,
                        socketTimeoutMS: 45000,
                        retryWrites: true,
                        w: 'majority',
                    };
                },
                inject: [config_1.ConfigService],
            }),
        ],
        providers: [mongodb_service_1.MongodbService],
        exports: [mongodb_service_1.MongodbService, mongoose_1.MongooseModule],
    })
], MongodbModule);
//# sourceMappingURL=mongodb.module.js.map