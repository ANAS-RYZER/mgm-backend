import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(signupDto: SignupDto): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        user: import("../users/schemas/user.schema").UserDocument;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto, req: any): Promise<{
        message: string;
        user: import("../users/schemas/user.schema").UserDocument;
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        user: import("../users/schemas/user.schema").UserDocument;
    }>;
    refreshAccessToken(refreshTokenDto: RefreshTokenDto): Promise<{
        accessToken: string;
    }>;
    logout(req: any): Promise<{
        message: string;
    }>;
    getProfile(req: any): Promise<{
        user: any;
    }>;
    resendOtp(req: any): Promise<{
        message: string;
    }>;
}
