import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order, OrderSchema } from './schema/order.schema';
import { Appointment, AppointmentSchema } from '../appoitment/schema/appointment.schema';
import { AuthModule } from '../auth/auth.module';
import { AgentModule } from '../agents/agent.module';
import { UsersModule } from '../users/users.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { AdminAuthModule } from '../admins/admin-auth.module';
import { AgentCommission, AgentCommissionSchema } from '../agents/schemas/agent.commission.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Appointment.name, schema: AppointmentSchema },
       {name : Product.name, schema:ProductSchema} ,
       {name: AgentCommission.name, schema:AgentCommissionSchema}
    ]),
    AuthModule,   
    AgentModule,      
    UsersModule, 
    AdminAuthModule,   
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService], 
})
export class OrderModule {}
