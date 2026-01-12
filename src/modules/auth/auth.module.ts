import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { JwtTokenService } from './services/jwt.service';
import { TokenStorageService } from './services/token-storage.service';
import { OtpService } from './services/otp.service';
import { RedisModule } from '../../infra/redis/redis.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
        return {
          secret: configService.get<string>('JWT_ACCESS_SECRET') || 'your-access-secret',
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    RedisModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtTokenService, TokenStorageService, OtpService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
