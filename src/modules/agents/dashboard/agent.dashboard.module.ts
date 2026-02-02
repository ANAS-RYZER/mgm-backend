
import { Module } from '@nestjs/common';
import { AgentModule } from '../agent.module';
import { AgentDashboardController } from './agent.dashboard.controller';

import { AgentDashboardService } from './agent.dashboard.service';

import { Agent } from '../schemas/agent.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentSchema } from '../schemas/agent.schema';
import { User, UserSchema } from 'src/modules/users/schemas/user.schema';

@Module({
  imports: [
    AgentModule,
    MongooseModule.forFeature([{ name: Agent.name, schema: AgentSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AgentDashboardController],
  providers: [AgentDashboardService],
})
export class AgentDashboardModule {}