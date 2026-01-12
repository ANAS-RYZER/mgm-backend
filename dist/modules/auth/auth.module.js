"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const user_schema_1 = require("../users/schemas/user.schema");
const jwt_service_1 = require("./services/jwt.service");
const token_storage_service_1 = require("./services/token-storage.service");
const otp_service_1 = require("./services/otp.service");
const redis_module_1 = require("../../infra/redis/redis.module");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: user_schema_1.User.name, schema: user_schema_1.UserSchema }]),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => {
                    const expiresIn = configService.get('JWT_ACCESS_EXPIRES_IN') || '15m';
                    return {
                        secret: configService.get('JWT_ACCESS_SECRET') || 'your-access-secret',
                        signOptions: {
                            expiresIn: expiresIn,
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
            redis_module_1.RedisModule,
            config_1.ConfigModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_service_1.JwtTokenService, token_storage_service_1.TokenStorageService, otp_service_1.OtpService, jwt_auth_guard_1.JwtAuthGuard],
        exports: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map