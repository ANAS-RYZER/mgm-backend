import { Model } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtTokenService } from './services/jwt.service';
import { TokenStorageService } from './services/token-storage.service';
import { OtpService } from './services/otp.service';
import { EmailService } from '../../infra/email/email.service';
export declare class AuthService {
    private userModel;
    private readonly jwtTokenService;
    private readonly tokenStorageService;
    private readonly otpService;
    private readonly emailService;
    private readonly logger;
    constructor(userModel: Model<UserDocument>, jwtTokenService: JwtTokenService, tokenStorageService: TokenStorageService, otpService: OtpService, emailService: EmailService);
    signup(signupDto: SignupDto): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        user: UserDocument;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto, request: any): Promise<{
        message: string;
        user: UserDocument;
    }>;
    private verifyEmail;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        user: UserDocument;
    }>;
    refreshAccessToken(refreshTokenDto: RefreshTokenDto): Promise<{
        accessToken: string;
    }>;
    logout(sessionId: string): Promise<{
        message: string;
    }>;
    resendOtp(request: any): Promise<{
        message: string;
    }>;
}
