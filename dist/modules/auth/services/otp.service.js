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
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../../infra/redis/redis.service");
let OtpService = class OtpService {
    redisService;
    constructor(redisService) {
        this.redisService = redisService;
    }
    normalizeEmail(email) {
        return email.toLowerCase().trim();
    }
    getOtpKey(email) {
        const normalizedEmail = this.normalizeEmail(email);
        return `otp:${normalizedEmail}`;
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async storeOtp(email, otp, expiresIn = 600) {
        const client = this.redisService.getClient();
        const normalizedEmail = this.normalizeEmail(email);
        const otpKey = this.getOtpKey(email);
        console.log(`Storing OTP in Redis - Key: ${otpKey}, Email: ${normalizedEmail}, OTP: ${otp}`);
        await client.setex(otpKey, expiresIn, otp);
    }
    async verifyOtp(email, otp) {
        const client = this.redisService.getClient();
        const normalizedEmail = this.normalizeEmail(email);
        const otpKey = this.getOtpKey(email);
        const storedOtp = await client.get(otpKey);
        if (!storedOtp) {
            console.log(`OTP not found in Redis for key: ${otpKey}, email: ${normalizedEmail}`);
            return false;
        }
        const storedOtpStr = String(storedOtp).trim();
        const providedOtpStr = String(otp).trim();
        if (storedOtpStr !== providedOtpStr) {
            console.log(`OTP mismatch - Stored: "${storedOtpStr}", Provided: "${providedOtpStr}"`);
            return false;
        }
        await client.del(otpKey);
        return true;
    }
    async deleteOtp(email) {
        const client = this.redisService.getClient();
        const otpKey = this.getOtpKey(email);
        await client.del(otpKey);
    }
    async otpExists(email) {
        const client = this.redisService.getClient();
        const otpKey = this.getOtpKey(email);
        const exists = await client.exists(otpKey);
        return exists === 1;
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], OtpService);
//# sourceMappingURL=otp.service.js.map