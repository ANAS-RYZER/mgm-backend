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
    token: string;
    message: string;
  }> {
    const { email, password, fullName , refId = "001" } = signupDto;

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user with isEmailVerified: false
    const user = await this.userModel.create({
      email: normalizedEmail,
      password: hashedPassword,
      fullName,
      refId,
      isEmailVerified: false,
    });

    this.logger.log(`User created with email: ${normalizedEmail}, isEmailVerified: false`);

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

    // Generate and send OTP
    try {
      const otp = this.otpService.generateOtp();
      await this.otpService.storeOtp(normalizedEmail, otp);
      await this.emailService.sendOtpToEmail(normalizedEmail, otp);
      this.logger.log(`OTP sent to ${normalizedEmail} during signup, OTP: ${otp}`);
    } catch (error: any) {
      this.logger.error(`Failed to send OTP email to ${normalizedEmail}:`, error.message);
      // Don't fail signup if OTP sending fails
    }

    return {
      token: accessToken,
      message: 'OTP sent to your email successfully',
    };
  }

  /**
   * Verify OTP and mark email as verified
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    user: UserDocument;
  }> {
    const { token, otp } = verifyOtpDto;

    this.logger.log(`[VERIFY-OTP] Starting verification with token`);

    // Verify and decode the token to get userId
    let decoded;
    try {
      decoded = this.jwtTokenService.verifyAccessToken(token);
      this.logger.log(`[VERIFY-OTP] Token decoded successfully, userId: ${decoded.userId}`);
    } catch (error) {
      this.logger.error(`[VERIFY-OTP] Token verification failed:`, error);
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!decoded.userId) {
      throw new UnauthorizedException('Invalid token data');
    }

    // Find user by ID
    const user = await this.userModel.findById(decoded.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(`[VERIFY-OTP] User found: ${user.email}`);

    // Verify the OTP (even if already verified)
    this.logger.log(`[VERIFY-OTP] Verifying OTP for: ${user.email}`);
    const isValid = await this.otpService.verifyOtp(user.email, otp);
    if (!isValid) {
      this.logger.warn(`[VERIFY-OTP] OTP verification failed for: ${user.email}, Provided OTP: ${otp}`);
      throw new BadRequestException('Invalid or expired OTP');
    }

    this.logger.log(`[VERIFY-OTP] OTP verified successfully for: ${user.email}`);

    // Update isEmailVerified to true (if not already)
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
      this.logger.log(`[VERIFY-OTP] Email verified and updated for: ${user.email}`);
    }

    // Generate new tokens and session
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

    this.logger.log(`[VERIFY-OTP] New tokens generated for: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      sessionId,
      user,
    };
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
    console.log(user , "user ")

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
    const { sessionId } = refreshTokenDto;

    // Get session data from Redis
    const sessionData = await this.tokenStorageService.getSessionData(sessionId);

    if (!sessionData) {
      throw new UnauthorizedException('Session not found. Please login again');
    }

    // Verify user still exists
    const user = await this.userModel.findById(sessionData.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate new access token
    const accessToken = this.jwtTokenService.generateAccessToken({
      userId: sessionData.userId,
      sessionId,
    });

    // Refresh the session expiry in Redis
    await this.tokenStorageService.refreshSessionExpiry(sessionId);

    return { accessToken };
  }

  async logout(sessionId: string): Promise<{ message: string }> {
    await this.tokenStorageService.deleteSession(sessionId);
    return { message: 'Logged out successfully' };
  }
  async resendOtp(email: string): Promise<{
    token: string;
    message: string;
  }> {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    this.logger.log(`[RESEND-OTP] Starting for email: ${normalizedEmail}`);

    // Check if user exists
    const user = await this.userModel.findOne({ email: normalizedEmail });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already verified
    if (user.isEmailVerified) {
      // Generate token even if already verified
      const sessionId = this.jwtTokenService.generateSessionId();
      const accessToken = this.jwtTokenService.generateAccessToken({
        userId: user._id.toString(),
        sessionId,
      });

      return {
        token: accessToken,
        message: 'Email already verified',
      };
    }

    // Generate new token for the user
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

    this.logger.log(`[RESEND-OTP] New token generated for: ${normalizedEmail}`);

    // Generate and send OTP
    try {
      const otp = this.otpService.generateOtp();
      await this.otpService.storeOtp(normalizedEmail, otp);
      this.logger.log(`[RESEND-OTP] OTP stored in Redis for: ${normalizedEmail}, OTP: ${otp}`);
      
      await this.emailService.sendOtpToEmail(normalizedEmail, otp);
      this.logger.log(`[RESEND-OTP] OTP email sent to: ${normalizedEmail}`);
    } catch (error: any) {
      this.logger.error(`[RESEND-OTP] Failed to send OTP to ${normalizedEmail}:`, error.message);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }

    return {
      token: accessToken,
      message: 'OTP sent to your email successfully',
    };
  }

  async getProfile(userId: string): Promise<{
    fullName: string;
    email: string;
    avatar: string;
    userId: string;
    refferalCode : string
  }> {
    const user = await this.userModel.findById(userId).select('fullName email avatar refId').lean();
    console.log(user, "user")
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      fullName: user.fullName || '',
      email: user.email,
      avatar: user.avatar,
      userId: user._id.toString() ,
      refferalCode  : user.refId
    };
  }

  async updateProfile(
    userId: string,
    updateData: { fullName?: string; avatar?: string },
  ): Promise<{
    message: string;
    updatedFields: Record<string, any>;
  }> {
    // Find user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Track updated fields
    const updatedFields: Record<string, any> = {};

    // Update only provided fields
    if (updateData.fullName !== undefined) {
      user.fullName = updateData.fullName;
      updatedFields.fullName = updateData.fullName;
    }

    if (updateData.avatar !== undefined) {
      user.avatar = updateData.avatar;
      updatedFields.avatar = updateData.avatar;
    }

    // Save changes
    await user.save();
    
    return {
      message: 'Profile updated successfully',
      updatedFields,
    };
  }
}

