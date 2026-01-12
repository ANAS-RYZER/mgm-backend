import { RedisService } from '../../../infra/redis/redis.service';
export declare class OtpService {
    private readonly redisService;
    constructor(redisService: RedisService);
    private normalizeEmail;
    private getOtpKey;
    generateOtp(): string;
    storeOtp(email: string, otp: string, expiresIn?: number): Promise<void>;
    verifyOtp(email: string, otp: string): Promise<boolean>;
    deleteOtp(email: string): Promise<void>;
    otpExists(email: string): Promise<boolean>;
}
