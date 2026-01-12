import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infra/redis/redis.service';

@Injectable()
export class OtpService {
  constructor(private readonly redisService: RedisService) {}

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private getOtpKey(email: string): string {
    const normalizedEmail = this.normalizeEmail(email);
    return `otp:${normalizedEmail}`;
  }

  /**
   * Generate a 6-digit OTP code
   */
  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Store OTP in Redis with expiration (default: 10 minutes)
   * @param email - User email address
   * @param otp - OTP code to store
   * @param expiresIn - Expiration time in seconds (default: 600 = 10 minutes)
   */
  async storeOtp(
    email: string,
    otp: string,
    expiresIn: number = 600, // 10 minutes
  ): Promise<void> {
    const client = this.redisService.getClient();
    const normalizedEmail = this.normalizeEmail(email);
    const otpKey = this.getOtpKey(email); // getOtpKey already normalizes
    console.log(`Storing OTP in Redis - Key: ${otpKey}, Email: ${normalizedEmail}, OTP: ${otp}`);
    await client.setex(otpKey, expiresIn, otp);
  }

  /**
   * Verify OTP for a given email
   * @param email - User email address
   * @param otp - OTP code to verify
   * @returns true if OTP is valid, false otherwise
   */
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const normalizedEmail = this.normalizeEmail(email);
    const otpKey = this.getOtpKey(email); // getOtpKey already normalizes
    const storedOtp = await client.get(otpKey);

    if (!storedOtp) {
      console.log(`OTP not found in Redis for key: ${otpKey}, email: ${normalizedEmail}`);
      return false; // OTP expired or doesn't exist
    }

    // Ensure both are strings for comparison
    const storedOtpStr = String(storedOtp).trim();
    const providedOtpStr = String(otp).trim();

    if (storedOtpStr !== providedOtpStr) {
      console.log(`OTP mismatch - Stored: "${storedOtpStr}", Provided: "${providedOtpStr}"`);
      return false; // OTP doesn't match
    }

    // OTP verified successfully, delete it (one-time use)
    await client.del(otpKey);
    return true;
  }

  /**
   * Delete OTP for a given email
   * @param email - User email address
   */
  async deleteOtp(email: string): Promise<void> {
    const client = this.redisService.getClient();
    const otpKey = this.getOtpKey(email);
    await client.del(otpKey);
  }

  /**
   * Check if OTP exists for a given email (without verifying)
   * @param email - User email address
   * @returns true if OTP exists, false otherwise
   */
  async otpExists(email: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const otpKey = this.getOtpKey(email);
    const exists = await client.exists(otpKey);
    return exists === 1;
  }
}

