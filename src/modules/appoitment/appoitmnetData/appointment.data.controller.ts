import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AppoitmenDatatService } from "./appointment.data.service";
import { AgentJwtAuthGuard } from "src/modules/agents/guards/agent-jwt-auth.guard";

@Controller("dashboard")
export class AppoitmentDataController {
  constructor(private readonly service: AppoitmenDatatService) {}

  @Get("appointment")
  @HttpCode(HttpStatus.OK)
  getAdminAppointment() {
    return this.service.getAdminAppointment();
  }

  @Get("agent")
  @UseGuards(AgentJwtAuthGuard)
  async getagentsAppointment(@Req() req: Request) {
    const agentId = (req as any).agent?.agentId ?? '';
    const agentReferralCode = (req as any).agentReferralCode ?? '';
    const data = await this.service.getAgentAppointments(agentId, agentReferralCode);
    console.log(data , "data")
    return { data };
  }
}
