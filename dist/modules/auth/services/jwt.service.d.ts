import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export interface TokenPayload {
    userId: string;
    sessionId?: string;
}
export declare class JwtTokenService {
    private readonly jwtService;
    private readonly configService;
    private readonly accessTokenSecret;
    private readonly refreshTokenSecret;
    private readonly accessTokenExpiresIn;
    private readonly refreshTokenExpiresIn;
    private readonly logger;
    constructor(jwtService: JwtService, configService: ConfigService);
    generateAccessToken(payload: TokenPayload): string;
    generateRefreshToken(payload: TokenPayload): string;
    verifyAccessToken(token: string): TokenPayload;
    verifyRefreshToken(token: string): TokenPayload;
    generateSessionId(): string;
}
