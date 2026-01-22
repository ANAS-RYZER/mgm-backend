import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './services/admin-auth.service';
import { Admin, AdminSchema } from './schemas/admin.schema';
import { AdminJwtTokenService } from './services/admin-jwt.service';
import { AdminTokenStorageService } from './services/admin-token-storage.service';
import { AdminOtpService } from './services/admin-otp.service';
import { RedisModule } from '../../infra/redis/redis.module';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { EmailModule } from '../../infra/email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>('ADMIN_JWT_ACCESS_EXPIRES_IN') || '15m';
        return {
          secret: configService.get<string>('ADMIN_JWT_ACCESS_SECRET') || 'admin-access-secret',
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    RedisModule,
    ConfigModule,
    EmailModule,
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    AdminJwtTokenService,
    AdminTokenStorageService,
    AdminOtpService,
    AdminJwtAuthGuard,
  ],
  exports: [AdminAuthService, AdminJwtAuthGuard],
})
export class AdminAuthModule {}

