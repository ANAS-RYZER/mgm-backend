
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  AgentCommission,
  AgentCommissionSchema,
} from "../schemas/agent.commission.schema";
import { AgentProfile, AgentProfileSchema } from "../schemas/agent.profile.schema";
import { Order, OrderSchema } from "../../order/schema/order.schema";
import { AdminAuthModule } from "../../admins/admin-auth.module";
import { AdminCommissionController } from "./agentCommission.controller";
import { AdminCommissionService } from "./agentCommission.service";
import { Appointment, AppointmentSchema } from "../../appoitment/schema/appointment.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentCommission.name, schema: AgentCommissionSchema },
      { name: AgentProfile.name, schema: AgentProfileSchema },
      { name: Order.name, schema: OrderSchema },
      {name: Appointment.name, schema: AppointmentSchema},
    ]),
    AdminAuthModule
  ],
  controllers: [AdminCommissionController],
  providers: [AdminCommissionService],
})
export class AdminCommissionModule {}