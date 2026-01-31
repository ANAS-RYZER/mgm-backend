import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../infra/redis/redis.service';
import { EmailService } from '../../../infra/email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class AgentOtpService {
  private readonly OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes
  private readonly USE_STATIC_OTP: boolean;
  private readonly STATIC_OTP = '123456';
  private readonly logger = new Logger(AgentOtpService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    // Use static OTP in development or when enabled
    this.USE_STATIC_OTP = 
      this.configService.get<string>('USE_STATIC_OTP') === 'true' ||
      this.configService.get<string>('NODE_ENV') === 'development';
    
    if (this.USE_STATIC_OTP) {
      this.logger.log('⚠️ Using static OTP for agent verification');
    }
  }

  /**
   * Generate a 6-digit OTP (or return static OTP if enabled)
   */
  private generateOTP(): string {
    if (this.USE_STATIC_OTP) {
      return this.STATIC_OTP;
    }
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Get Redis key for agent OTP (supports email or phone)
   */
  private getOtpKey(identifier: string): string {
    return `agent:otp:${identifier.toLowerCase()}`;
  }

  /**
   * Get Redis key for phone OTP
   */
  private getPhoneOtpKey(phoneNumber: string): string {
    return `agent:otp:phone:${phoneNumber}`;
  }

  /**
   * Store OTP in Redis
   */
  async storeOTP(email: string, otp: string): Promise<void> {
    const client = this.redisService.getClient();
    const key = this.getOtpKey(email);
    await client.setex(key, this.OTP_EXPIRY_SECONDS, otp);
  }

  /**
   * Get OTP from Redis
   */
  async getOTP(email: string): Promise<string | null> {
    const client = this.redisService.getClient();
    const key = this.getOtpKey(email);
    return await client.get(key);
  }

  /**
   * Delete OTP from Redis
   */
  async deleteOTP(email: string): Promise<void> {
    const client = this.redisService.getClient();
    const key = this.getOtpKey(email);
    await client.del(key);
  }

  /**
   * Send OTP to agent's email
   */
  async sendOtpToEmail(email: string, name: string): Promise<void> {
    const otp = this.generateOTP();
    
    // Store OTP in Redis
    await this.storeOTP(email, otp);

    // Send OTP email
    await this.emailService.sendEmail(
      email,
      'Agent Email Verification - OTP',
      'agent-otp',
      {
        name,
        otp,
        expiryMinutes: 5,
      },
    );

    if (this.USE_STATIC_OTP) {
      this.logger.log(`📧 Email OTP for ${email}: ${otp}`);
    }
  }

  /**
   * Send OTP to agent's phone number
   */
  async sendOtpToPhone(phoneNumber: string, name: string): Promise<void> {
    const otp = this.generateOTP();
    
    // Store OTP in Redis using phone number as key
    const client = this.redisService.getClient();
    const key = this.getPhoneOtpKey(phoneNumber);
    await client.setex(key, this.OTP_EXPIRY_SECONDS, otp);

    // TODO: Integrate with SMS provider (Twilio, AWS SNS, MSG91, etc.)
    // await this.sendSMS(phoneNumber, `Your MGM Agent verification OTP is: ${otp}. Valid for 5 minutes.`);
    
    this.logger.log(`📱 SMS OTP for ${phoneNumber}: ${otp} (SMS not sent - integrate SMS provider)`);
  }

  /**
   * Get OTP for phone number
   */
  async getPhoneOTP(phoneNumber: string): Promise<string | null> {
    const client = this.redisService.getClient();
    const key = this.getPhoneOtpKey(phoneNumber);
    return await client.get(key);
  }

  /**
   * Delete phone OTP
   */
  async deletePhoneOTP(phoneNumber: string): Promise<void> {
    const client = this.redisService.getClient();
    const key = this.getPhoneOtpKey(phoneNumber);
    await client.del(key);
  }

  /**
   * Verify phone OTP
   */
  async verifyPhoneOTP(phoneNumber: string, otp: string): Promise<boolean> {
    const storedOtp = await this.getPhoneOTP(phoneNumber);

    if (!storedOtp) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    if (storedOtp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Delete OTP after successful verification
    await this.deletePhoneOTP(phoneNumber);
    return true;
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const storedOtp = await this.getOTP(email);

    if (!storedOtp) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    if (storedOtp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Delete OTP after successful verification
    await this.deleteOTP(email);
    return true;
  }

  /**
   * Check if OTP exists for email
   */
  async hasOTP(email: string): Promise<boolean> {
    const otp = await this.getOTP(email);
    return otp !== null;
  }
}

