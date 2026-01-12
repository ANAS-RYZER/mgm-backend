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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcrypt"));
const user_schema_1 = require("../users/schemas/user.schema");
const jwt_service_1 = require("./services/jwt.service");
const token_storage_service_1 = require("./services/token-storage.service");
const otp_service_1 = require("./services/otp.service");
const email_service_1 = require("../../infra/email/email.service");
let AuthService = AuthService_1 = class AuthService {
    userModel;
    jwtTokenService;
    tokenStorageService;
    otpService;
    emailService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(userModel, jwtTokenService, tokenStorageService, otpService, emailService) {
        this.userModel = userModel;
        this.jwtTokenService = jwtTokenService;
        this.tokenStorageService = tokenStorageService;
        this.otpService = otpService;
        this.emailService = emailService;
    }
    async signup(signupDto) {
        const { email, password, fullName } = signupDto;
        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userModel.create({
            email,
            password: hashedPassword,
            fullName,
            isEmailVerified: false,
        });
        const sessionId = this.jwtTokenService.generateSessionId();
        const accessToken = this.jwtTokenService.generateAccessToken({
            userId: user._id.toString(),
            sessionId,
        });
        const refreshToken = this.jwtTokenService.generateRefreshToken({
            userId: user._id.toString(),
            sessionId,
        });
        await this.tokenStorageService.storeTokens(sessionId, user._id.toString(), refreshToken);
        if (!user.isEmailVerified) {
            try {
                const otp = this.otpService.generateOtp();
                await this.otpService.storeOtp(user.email, otp);
                await this.emailService.sendOtpToEmail(user.email, otp);
                this.logger.log(`OTP sent to ${user.email} during signup, OTP: ${otp}`);
            }
            catch (error) {
                this.logger.error(`Failed to send OTP email to ${user.email}:`, error.message);
            }
        }
        return {
            accessToken,
            refreshToken,
            sessionId,
            user,
        };
    }
    async verifyOtp(verifyOtpDto, request) {
        const { otp } = verifyOtpDto;
        const userId = request.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException('User information not found in token');
        }
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const otpExists = await this.otpService.otpExists(user.email);
        const isValid = await this.otpService.verifyOtp(user.email, otp);
        if (!isValid) {
            this.logger.warn(`OTP verification failed for user: ${user.email}, OTP: ${otp}`);
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        if (user.isEmailVerified) {
            throw new common_1.ConflictException('Email already verified');
        }
        user.isEmailVerified = true;
        await user.save();
        this.logger.log(`Email verified successfully for ${user.email}`);
        return {
            user: user,
            message: 'Email verified successfully'
        };
    }
    async verifyEmail(email) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.isEmailVerified) {
            throw new common_1.ConflictException('Email already verified');
        }
        user.isEmailVerified = true;
        await user.save();
        return { message: 'Email verified successfully' };
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (!user.password) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const sessionId = this.jwtTokenService.generateSessionId();
        const accessToken = this.jwtTokenService.generateAccessToken({
            userId: user._id.toString(),
            sessionId,
        });
        const refreshToken = this.jwtTokenService.generateRefreshToken({
            userId: user._id.toString(),
            sessionId,
        });
        await this.tokenStorageService.storeTokens(sessionId, user._id.toString(), refreshToken);
        return {
            accessToken,
            refreshToken,
            sessionId,
            user,
        };
    }
    async refreshAccessToken(refreshTokenDto) {
        const { refreshToken } = refreshTokenDto;
        const decoded = this.jwtTokenService.verifyRefreshToken(refreshToken);
        if (!decoded.userId || !decoded.sessionId) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const sessionData = await this.tokenStorageService.getSessionData(decoded.sessionId);
        if (!sessionData) {
            throw new common_1.UnauthorizedException('Session not found. Please login again');
        }
        if (sessionData.refreshToken !== refreshToken) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (sessionData.userId !== decoded.userId) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const user = await this.userModel.findById(decoded.userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const accessToken = this.jwtTokenService.generateAccessToken({
            userId: decoded.userId,
            sessionId: decoded.sessionId,
        });
        await this.tokenStorageService.refreshSessionExpiry(decoded.sessionId);
        return { accessToken };
    }
    async logout(sessionId) {
        await this.tokenStorageService.deleteSession(sessionId);
        return { message: 'Logged out successfully' };
    }
    async resendOtp(request) {
        const userId = request.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException('User information not found in token');
        }
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const otp = this.otpService.generateOtp();
        await this.otpService.storeOtp(user.email, otp);
        await this.emailService.sendOtpToEmail(user.email, otp);
        return { message: 'OTP resent successfully' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        jwt_service_1.JwtTokenService,
        token_storage_service_1.TokenStorageService,
        otp_service_1.OtpService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map