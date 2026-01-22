import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminSignupDto } from './dto/admin-signup.dto';
import { AdminRefreshTokenDto } from './dto/admin-refresh-token.dto';
import { AdminVerifyOtpDto } from './dto/admin-verify-otp.dto';
import { AdminResendOtpDto } from './dto/admin-resend-otp.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() signupDto: AdminSignupDto) {
    return this.adminAuthService.signup(signupDto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: AdminVerifyOtpDto) {
    return this.adminAuthService.verifyOtp(verifyOtpDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: AdminLoginDto) {
    return this.adminAuthService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshAccessToken(@Body() refreshTokenDto: AdminRefreshTokenDto) {
    return this.adminAuthService.refreshAccessToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    const sessionId = req.user?.sessionId;
    if (!sessionId) {
      return { message: 'Logged out successfully' };
    }
    return this.adminAuthService.logout(sessionId);
  }

  @Get()
  @UseGuards(AdminJwtAuthGuard)
  async getProfile(@Request() req) {
    const adminId = req.user?.adminId;
    return this.adminAuthService.getProfile(adminId);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() resendOtpDto: AdminResendOtpDto) {
    return this.adminAuthService.resendOtp(resendOtpDto.email);
  }
}

