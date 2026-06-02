import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { Order, OrderSchema } from '../../order/schema/order.schema';
import { Product, ProductSchema } from '../../products/schemas/product.schema';
import {
  AgentCommission,
  AgentCommissionSchema,
} from '../../agents/schemas/agent.commission.schema';
import { AdminAuthModule } from '../admin-auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: AgentCommission.name, schema: AgentCommissionSchema },
    ]),
    AdminAuthModule,
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
