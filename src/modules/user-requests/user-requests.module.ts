import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserRequest, UserRequestSchema } from './schemas/user-request.schema';
import { AgentProfile, AgentProfileSchema } from '../agents/schemas/agent.profile.schema';
import { UserRequestsController } from './user-requests.controller';
import { UserRequestsService } from './user-requests.service';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthModule } from '../admins/admin-auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserRequest.name, schema: UserRequestSchema },
      { name: AgentProfile.name, schema: AgentProfileSchema },
    ]),
    AuthModule, // For JwtAuthGuard
    AdminAuthModule, // For AdminJwtAuthGuard
  ],
  controllers: [UserRequestsController],
  providers: [UserRequestsService],
  exports: [UserRequestsService],
})
export class UserRequestsModule {}

