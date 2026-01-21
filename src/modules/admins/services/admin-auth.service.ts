import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from '../schemas/admin.schema';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { AdminSignupDto } from '../dto/admin-signup.dto';
import { AdminRefreshTokenDto } from '../dto/admin-refresh-token.dto';
import { AdminVerifyOtpDto } from '../dto/admin-verify-otp.dto';
import { AdminJwtTokenService } from './admin-jwt.service';
import { AdminTokenStorageService } from './admin-token-storage.service';
import { AdminOtpService } from './admin-otp.service';
import { EmailService } from '../../../infra/email/email.service';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private readonly adminJwtTokenService: AdminJwtTokenService,
    private readonly adminTokenStorageService: AdminTokenStorageService,
    private readonly adminOtpService: AdminOtpService,
    private readonly emailService: EmailService,
  ) {}

  async signup(signupDto: AdminSignupDto): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    admin: AdminDocument;
  }> {
    const { email, password, fullName } = signupDto;

    // Additional security: Verify email domain
    if (!email.toLowerCase().endsWith('@ryzer.app')) {
      throw new BadRequestException('Admin email must be from @ryzer.app domain');
    }

    // Check if admin already exists
    const existingAdmin = await this.adminModel.findOne({ email });
    if (existingAdmin) {
      throw new ConflictException('Admin with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new admin
    const admin = await this.adminModel.create({
      email,
      password: hashedPassword,
      fullName,
      isEmailVerified: false,
      role: 'admin',
    });

    // Generate tokens and store in Redis
    const sessionId = this.adminJwtTokenService.generateSessionId();
    const accessToken = this.adminJwtTokenService.generateAccessToken({
      adminId: admin._id.toString(),
      sessionId,
      role: 'admin',
    });
    const refreshToken = this.adminJwtTokenService.generateRefreshToken({
      adminId: admin._id.toString(),
      sessionId,
      role: 'admin',
    });

    // Store refresh token in Redis
    await this.adminTokenStorageService.storeTokens(
      sessionId,
      admin._id.toString(),
      refreshToken,
    );

    // Send OTP email immediately if email is not verified
    if (!admin.isEmailVerified) {
      try {
        const otp = this.adminOtpService.generateOtp();
        await this.adminOtpService.storeOtp(admin.email, otp);
        await this.emailService.sendAdminOtpToEmail(admin.email, otp);
        this.logger.log(`[ADMIN] OTP sent to ${admin.email} during signup, OTP: ${otp}`);
      } catch (error: any) {
        this.logger.error(`[ADMIN] Failed to send OTP email to ${admin.email}:`, error.message);
      }
    }

    return {
      accessToken,
      refreshToken,
      sessionId,
      admin,
    };
  }

  async login(loginDto: AdminLoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    admin: AdminDocument;
  }> {
    const { email, password } = loginDto;

    // Additional security: Verify email domain
    if (!email.toLowerCase().endsWith('@ryzer.app')) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Find admin by email
    const admin = await this.adminModel.findOne({ email });
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens and store in Redis
    const sessionId = this.adminJwtTokenService.generateSessionId();
    const accessToken = this.adminJwtTokenService.generateAccessToken({
      adminId: admin._id.toString(),
      sessionId,
      role: 'admin',
    });
    const refreshToken = this.adminJwtTokenService.generateRefreshToken({
      adminId: admin._id.toString(),
      sessionId,
      role: 'admin',
    });

    // Store refresh token in Redis
    await this.adminTokenStorageService.storeTokens(
      sessionId,
      admin._id.toString(),
      refreshToken,
    );

    // Send OTP email if email is not verified
    if (!admin.isEmailVerified) {
      try {
        const otp = this.adminOtpService.generateOtp();
        await this.adminOtpService.storeOtp(admin.email, otp);
        await this.emailService.sendAdminOtpToEmail(admin.email, otp);
        this.logger.log(`[ADMIN] OTP sent to ${admin.email} during login, OTP: ${otp}`);
      } catch (error: any) {
        this.logger.error(`[ADMIN] Failed to send OTP email to ${admin.email}:`, error.message);
      }
    }

    return {
      accessToken,
      refreshToken,
      sessionId,
      admin,
    };
  }

  async verifyOtp(verifyOtpDto: AdminVerifyOtpDto, req: any): Promise<{
    message: string;
    isEmailVerified: boolean;
  }> {
    const adminId = req.user?.adminId;
    if (!adminId) {
      throw new UnauthorizedException('Admin not authenticated');
    }

    const admin = await this.adminModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.isEmailVerified) {
      return {
        message: 'Email already verified',
        isEmailVerified: true,
      };
    }

    const isOtpValid = await this.adminOtpService.verifyOtp(admin.email, verifyOtpDto.otp);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Update admin email verification status
    admin.isEmailVerified = true;
    await admin.save();

    return {
      message: 'Email verified successfully',
      isEmailVerified: true,
    };
  }

  async refreshAccessToken(refreshTokenDto: AdminRefreshTokenDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const { refreshToken } = refreshTokenDto;

    // Verify refresh token
    const payload = this.adminJwtTokenService.verifyRefreshToken(refreshToken);
    const { adminId, sessionId } = payload;

    if (!sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get session data from Redis
    const sessionData = await this.adminTokenStorageService.getSessionData(sessionId);
    if (!sessionData || sessionData.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check if admin still exists
    const admin = await this.adminModel.findById(adminId);
    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    // Generate new tokens
    const newAccessToken = this.adminJwtTokenService.generateAccessToken({
      adminId: admin._id.toString(),
      sessionId,
      role: 'admin',
    });
    const newRefreshToken = this.adminJwtTokenService.generateRefreshToken({
      adminId: admin._id.toString(),
      sessionId,
      role: 'admin',
    });

    // Update refresh token in Redis
    await this.adminTokenStorageService.storeTokens(
      sessionId,
      admin._id.toString(),
      newRefreshToken,
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(sessionId: string): Promise<{ message: string }> {
    await this.adminTokenStorageService.deleteSession(sessionId);
    return { message: 'Logged out successfully' };
  }

  async resendOtp(req: any): Promise<{ message: string }> {
    const adminId = req.user?.adminId;
    if (!adminId) {
      throw new UnauthorizedException('Admin not authenticated');
    }

    const admin = await this.adminModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate and send new OTP
    const otp = this.adminOtpService.generateOtp();
    await this.adminOtpService.storeOtp(admin.email, otp);
    await this.emailService.sendAdminOtpToEmail(admin.email, otp);

    this.logger.log(`[ADMIN] OTP resent to ${admin.email}, OTP: ${otp}`);

    return { message: 'OTP sent successfully' };
  }

  async getProfile(req: any): Promise<{
    admin: {
      _id: string;
      email: string;
      fullName?: string;
      role?: string;
      isEmailVerified: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    };
  }> {
    const adminId = req.user?.adminId;
    if (!adminId) {
      throw new UnauthorizedException('Admin not authenticated');
    }

    const admin = await this.adminModel.findById(adminId).select('-password');
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return {
      admin: {
        _id: admin._id.toString(),
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        isEmailVerified: admin.isEmailVerified,
        createdAt: (admin as any).createdAt,
        updatedAt: (admin as any).updatedAt,
      },
    };
  }
}

