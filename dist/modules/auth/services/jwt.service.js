"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JwtTokenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtTokenService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const common_2 = require("@nestjs/common");
let JwtTokenService = JwtTokenService_1 = class JwtTokenService {
    jwtService;
    configService;
    accessTokenSecret;
    refreshTokenSecret;
    accessTokenExpiresIn;
    refreshTokenExpiresIn;
    logger = new common_2.Logger(JwtTokenService_1.name);
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.accessTokenSecret =
            this.configService.getOrThrow('JWT_ACCESS_SECRET');
        this.refreshTokenSecret =
            this.configService.getOrThrow('JWT_REFRESH_SECRET');
        this.accessTokenExpiresIn =
            this.configService.getOrThrow('JWT_ACCESS_EXPIRES_IN');
        this.refreshTokenExpiresIn =
            this.configService.getOrThrow('JWT_REFRESH_EXPIRES_IN');
        this.logger.log('accessTokenSecret =', this.accessTokenSecret);
        this.logger.log('refreshTokenSecret =', this.refreshTokenSecret);
        this.logger.log('accessTokenExpiresIn =', this.accessTokenExpiresIn);
        this.logger.log('refreshTokenExpiresIn =', this.refreshTokenExpiresIn);
    }
    generateAccessToken(payload) {
        return this.jwtService.sign(payload, {
            secret: this.accessTokenSecret,
            expiresIn: this.accessTokenExpiresIn,
        });
    }
    generateRefreshToken(payload) {
        return this.jwtService.sign(payload, {
            secret: this.refreshTokenSecret,
            expiresIn: this.refreshTokenExpiresIn,
        });
    }
    verifyAccessToken(token) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.accessTokenSecret,
            });
            return payload;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid or expired access token');
        }
    }
    verifyRefreshToken(token) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.refreshTokenSecret,
            });
            return payload;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }
};
exports.JwtTokenService = JwtTokenService;
exports.JwtTokenService = JwtTokenService = JwtTokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], JwtTokenService);
//# sourceMappingURL=jwt.service.js.map