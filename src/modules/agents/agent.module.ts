import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Agent, AgentSchema } from "./schemas/agent.schema";
import {
  AgentCounter,
  AgentCounterSchema,
} from "./schemas/agent.counter.schema";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { AgentJwtService } from "./services/agent-jwt.service";
import { AgentTokenStorageService } from "./services/agent-token-storage.service";
import { AgentOtpService } from "./services/agent-otp.service";
import { AgentJwtAuthGuard } from "./guards/agent-jwt-auth.guard";
import { AdminAuthModule } from "../admins/admin-auth.module";
import { EmailModule } from "../../infra/email/email.module";
import { RedisModule } from "../../infra/redis/redis.module";
import {
  AgentProfile,
  AgentProfileSchema,
} from "./schemas/agent.profile.schema";
import { AgentDashboardController } from "./dashboard/agent.dashboard.controller";
import { AgentDashboardService } from "./dashboard/agent.dashboard.service";
import { User, UserSchema } from "../users/schemas/user.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Agent.name, schema: AgentSchema },
      { name: AgentProfile.name, schema: AgentProfileSchema },
      { name: AgentCounter.name, schema: AgentCounterSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn =
          configService.get<string>("AGENT_JWT_ACCESS_EXPIRES_IN") ||
          configService.get<string>("JWT_ACCESS_EXPIRES_IN") ||
          "15m";
        return {
          secret:
            configService.get<string>("AGENT_JWT_ACCESS_SECRET") ||
            configService.get<string>("JWT_ACCESS_SECRET") ||
            "agent-access-secret",
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    AdminAuthModule, // Import for AdminJwtAuthGuard
    EmailModule, // Import for EmailService
    RedisModule, // Import for Redis/Session storage
    ConfigModule,
  ],
  controllers: [AgentController, AgentDashboardController],
  providers: [
    AgentService,
    AgentJwtService,
    AgentTokenStorageService,
    AgentOtpService,
    AgentJwtAuthGuard,
    AgentDashboardService,
  ],
  exports: [AgentService, AgentJwtAuthGuard, AgentJwtService, MongooseModule],
})
export class AgentModule {}
