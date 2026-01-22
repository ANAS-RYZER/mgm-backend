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
    token: string;
    message: string;
  }> {
    const { email, password, fullName } = signupDto;

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Additional security: Verify email domain
    if (!normalizedEmail.endsWith('@ryzer.app')) {
      throw new BadRequestException('Admin email must be from @ryzer.app domain');
    }

    // Check if admin already exists
    const existingAdmin = await this.adminModel.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      throw new ConflictException('Admin with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new admin with isEmailVerified: false
    const admin = await this.adminModel.create({
      email: normalizedEmail,
      password: hashedPassword,
      fullName,
      isEmailVerified: false,
      role: 'admin',
    });

    this.logger.log(`[ADMIN] Admin created with email: ${normalizedEmail}, isEmailVerified: false`);

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

    // Generate and send OTP
    try {
      const otp = this.adminOtpService.generateOtp();
      await this.adminOtpService.storeOtp(normalizedEmail, otp);
      await this.emailService.sendAdminOtpToEmail(normalizedEmail, otp);
      this.logger.log(`[ADMIN] OTP sent to ${normalizedEmail} during signup, OTP: ${otp}`);
    } catch (error: any) {
      this.logger.error(`[ADMIN] Failed to send OTP email to ${normalizedEmail}:`, error.message);
      // Don't fail signup if OTP sending fails
    }

    return {
      token: accessToken,
      message: 'OTP sent to your email successfully',
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

  async verifyOtp(verifyOtpDto: AdminVerifyOtpDto): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    admin: AdminDocument;
  }> {
    const { token, otp } = verifyOtpDto;

    this.logger.log(`[ADMIN-VERIFY-OTP] Starting verification with token`);

    // Verify and decode the token to get adminId
    let decoded;
    try {
      decoded = this.adminJwtTokenService.verifyAccessToken(token);
      this.logger.log(`[ADMIN-VERIFY-OTP] Token decoded successfully, adminId: ${decoded.adminId}`);
    } catch (error) {
      this.logger.error(`[ADMIN-VERIFY-OTP] Token verification failed:`, error);
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!decoded.adminId) {
      throw new UnauthorizedException('Invalid token data');
    }

    // Find admin by ID
    const admin = await this.adminModel.findById(decoded.adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    this.logger.log(`[ADMIN-VERIFY-OTP] Admin found: ${admin.email}`);

    // Verify the OTP (even if already verified)
    this.logger.log(`[ADMIN-VERIFY-OTP] Verifying OTP for: ${admin.email}`);
    const isValid = await this.adminOtpService.verifyOtp(admin.email, otp);
    if (!isValid) {
      this.logger.warn(`[ADMIN-VERIFY-OTP] OTP verification failed for: ${admin.email}, Provided OTP: ${otp}`);
      throw new BadRequestException('Invalid or expired OTP');
    }

    this.logger.log(`[ADMIN-VERIFY-OTP] OTP verified successfully for: ${admin.email}`);

    // Update isEmailVerified to true (if not already)
    if (!admin.isEmailVerified) {
      admin.isEmailVerified = true;
      await admin.save();
      this.logger.log(`[ADMIN-VERIFY-OTP] Email verified and updated for: ${admin.email}`);
    }

    // Generate new tokens and session
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

    this.logger.log(`[ADMIN-VERIFY-OTP] New tokens generated for: ${admin.email}`);

    return {
      accessToken,
      refreshToken,
      sessionId,
      admin,
    };
  }

  async refreshAccessToken(refreshTokenDto: AdminRefreshTokenDto): Promise<{
    accessToken: string;
  }> {
    const { sessionId } = refreshTokenDto;

    // Get session data from Redis
    const sessionData = await this.adminTokenStorageService.getSessionData(sessionId);

    if (!sessionData) {
      throw new UnauthorizedException('Session not found. Please login again');
    }

    // Verify admin still exists
    const admin = await this.adminModel.findById(sessionData.adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Generate new access token
    const accessToken = this.adminJwtTokenService.generateAccessToken({
      adminId: sessionData.adminId,
      sessionId,
      role: 'admin',
    });

    // Refresh the session expiry in Redis
    await this.adminTokenStorageService.refreshSessionExpiry(sessionId);

    return { accessToken };
  }

  async logout(sessionId: string): Promise<{ message: string }> {
    await this.adminTokenStorageService.deleteSession(sessionId);
    return { message: 'Logged out successfully' };
  }

  async resendOtp(email: string): Promise<{
    token: string;
    message: string;
  }> {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    this.logger.log(`[ADMIN-RESEND-OTP] Starting for email: ${normalizedEmail}`);

    // Check if admin exists
    const admin = await this.adminModel.findOne({ email: normalizedEmail });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Check if already verified
    if (admin.isEmailVerified) {
      // Generate token even if already verified
      const sessionId = this.adminJwtTokenService.generateSessionId();
      const accessToken = this.adminJwtTokenService.generateAccessToken({
        adminId: admin._id.toString(),
        sessionId,
        role: 'admin',
      });

      return {
        token: accessToken,
        message: 'Email already verified',
      };
    }

    // Generate new token for the admin
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

    this.logger.log(`[ADMIN-RESEND-OTP] New token generated for: ${normalizedEmail}`);

    // Generate and send OTP
    try {
      const otp = this.adminOtpService.generateOtp();
      await this.adminOtpService.storeOtp(normalizedEmail, otp);
      this.logger.log(`[ADMIN-RESEND-OTP] OTP stored in Redis for: ${normalizedEmail}, OTP: ${otp}`);
      
      await this.emailService.sendAdminOtpToEmail(normalizedEmail, otp);
      this.logger.log(`[ADMIN-RESEND-OTP] OTP email sent to: ${normalizedEmail}`);
    } catch (error: any) {
      this.logger.error(`[ADMIN-RESEND-OTP] Failed to send OTP to ${normalizedEmail}:`, error.message);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }

    return {
      token: accessToken,
      message: 'OTP sent to your email successfully',
    };
  }

  async getProfile(adminId: string): Promise<{
    fullName: string;
    email: string;
    avatar: string;
  }> {
    const admin = await this.adminModel.findById(adminId).select('fullName email avatar').lean();
    
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return {
      fullName: admin.fullName || '',
      email: admin.email,
      avatar: admin.avatar,
    };
  }
}

