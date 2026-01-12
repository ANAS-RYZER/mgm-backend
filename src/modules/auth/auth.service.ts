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
import { User, UserDocument } from '../users/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtTokenService } from './services/jwt.service';
import { TokenStorageService } from './services/token-storage.service';
import { OtpService } from './services/otp.service';
import { EmailService } from '../../infra/email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly jwtTokenService: JwtTokenService,
    private readonly tokenStorageService: TokenStorageService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
  ) {}

  async signup(signupDto: SignupDto): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    user: UserDocument;
  }> {
    const { email, password, fullName } = signupDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = await this.userModel.create({
      email,
      password: hashedPassword,
      fullName,
      isEmailVerified: false,
    });

    // Generate tokens and store in Redis
    const sessionId = this.jwtTokenService.generateSessionId();
    const accessToken = this.jwtTokenService.generateAccessToken({
      userId: user._id.toString(),
      sessionId,
    });
    const refreshToken = this.jwtTokenService.generateRefreshToken({
      userId: user._id.toString(),
      sessionId,
    });

    // Store refresh token in Redis
    await this.tokenStorageService.storeTokens(
      sessionId,
      user._id.toString(),
      refreshToken,
    );

    // Send OTP email immediately if email is not verified
    if (!user.isEmailVerified) {
      try {
        const otp = this.otpService.generateOtp();
        // Use the normalized email from the database (which is lowercase) to store OTP
        // This ensures consistency when verifying later
        await this.otpService.storeOtp(user.email, otp);
        await this.emailService.sendOtpToEmail(user.email, otp);
        this.logger.log(`OTP sent to ${user.email} during signup, OTP: ${otp}`);
      } catch (error: any) {
        // Log error but don't fail signup if email sending fails
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

  /**
   * Verify OTP and mark email as verified
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto, request: any): Promise<{ message: string , user: UserDocument }> {
    const { otp } = verifyOtpDto;
    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('User information not found in token');
    }

    // Get user from database using userId from JWT token
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otpExists = await this.otpService.otpExists(user.email);

    // Verify the OTP using the user's email
    const isValid = await this.otpService.verifyOtp(user.email, otp);
    if (!isValid) {
      this.logger.warn(`OTP verification failed for user: ${user.email}, OTP: ${otp}`);
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (user.isEmailVerified) {
      throw new ConflictException('Email already verified');
    }

    // Mark email as verified
    user.isEmailVerified = true;
    await user.save();

    this.logger.log(`Email verified successfully for ${user.email}`);
    return {
      user: user,
      message: 'Email verified successfully' };
  }

  /**
   * Private method to mark email as verified (used internally)
   */
  private async verifyEmail(email: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isEmailVerified) {
      throw new ConflictException('Email already verified');
    }
    user.isEmailVerified = true;
    await user.save();
    return { message: 'Email verified successfully' };
  }

  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    user: UserDocument;
  }> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user has a password (social login users might not have one)
    if (!user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens and store in Redis
    const sessionId = this.jwtTokenService.generateSessionId();
    const accessToken = this.jwtTokenService.generateAccessToken({
      userId: user._id.toString(),
      sessionId,
    });
    const refreshToken = this.jwtTokenService.generateRefreshToken({
      userId: user._id.toString(),
      sessionId,
    });

    // Store refresh token in Redis
    await this.tokenStorageService.storeTokens(
      sessionId,
      user._id.toString(),
      refreshToken,
    );

    return {
      accessToken,
      refreshToken,
      sessionId,
      user,
    };
  }

  async refreshAccessToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
    const { refreshToken } = refreshTokenDto;

    // Verify refresh token
    const decoded = this.jwtTokenService.verifyRefreshToken(refreshToken);

    if (!decoded.userId || !decoded.sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get session data from Redis
    const sessionData = await this.tokenStorageService.getSessionData(
      decoded.sessionId,
    );

    if (!sessionData) {
      throw new UnauthorizedException('Session not found. Please login again');
    }

    // Verify the refresh token matches the one in Redis
    if (sessionData.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify the user ID matches
    if (sessionData.userId !== decoded.userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify user still exists
    const user = await this.userModel.findById(decoded.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate new access token
    const accessToken = this.jwtTokenService.generateAccessToken({
      userId: decoded.userId,
      sessionId: decoded.sessionId,
    });

    // Refresh the session expiry in Redis
    await this.tokenStorageService.refreshSessionExpiry(decoded.sessionId);

    return { accessToken };
  }

  async logout(sessionId: string): Promise<{ message: string }> {
    await this.tokenStorageService.deleteSession(sessionId);
    return { message: 'Logged out successfully' };
  }
  async resendOtp( request: any): Promise<{ message: string }> {
    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('User information not found in token');
    }
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const otp = this.otpService.generateOtp();
    await this.otpService.storeOtp(user.email, otp);
    await this.emailService.sendOtpToEmail(user.email, otp);
    return { message: 'OTP resent successfully' };
  }
}

