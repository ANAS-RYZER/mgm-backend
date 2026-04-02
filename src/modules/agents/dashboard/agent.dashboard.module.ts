import { Product, ProductSchema } from './../../products/schemas/product.schema';

import { Module } from '@nestjs/common';
import { AgentModule } from '../agent.module';
import { AgentDashboardController } from './agent.dashboard.controller';

import { AgentDashboardService } from './agent.dashboard.service';

import { AgentProfile, AgentProfileSchema } from '../schemas/agent.profile.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { Order , OrderSchema} from '../../order/schema/order.schema';
import { AgentCommission, AgentCommissionSchema } from '../schemas/agent.commission.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentProfile.name, schema: AgentProfileSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: AgentCommission.name, schema: AgentCommissionSchema },
    ]),
  ],
  controllers: [AgentDashboardController],
  providers: [AgentDashboardService],
})
export class AgentDashboardModule {}