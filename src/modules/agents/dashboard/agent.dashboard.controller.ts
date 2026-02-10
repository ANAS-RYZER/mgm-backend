import { Controller, Get, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { AgentDashboardService } from "./agent.dashboard.service";
import { AgentJwtAuthGuard } from "../guards/agent-jwt-auth.guard";
import type { Request } from "express";

@Controller('agent-dashboard')
export class AgentDashboardController {
  constructor(private readonly agentDashboardService: AgentDashboardService) {}
  @Get('customers')
  @UseGuards(AgentJwtAuthGuard) 
  async getCustomers(@Req() req: Request) {
    const agentId = req['agent'].agentId;
    const customers = await this.agentDashboardService.getCustomersByAgentId(agentId);
    return customers;
  }

  @Get('me')
  @UseGuards(AgentJwtAuthGuard)
  async getAgent(@Req() req: Request) {
    const agentId = req['agent'].agentId;
    const agent = await this.agentDashboardService.getAgent(agentId);
    return agent;
  }
}