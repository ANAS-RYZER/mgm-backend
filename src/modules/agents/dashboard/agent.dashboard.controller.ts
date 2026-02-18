import { Controller, Get, Param, Req, UnauthorizedException, UseGuards, Query } from "@nestjs/common";
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

  @Get('user/:id')
  @UseGuards(AgentJwtAuthGuard)
  async getUserById(@Param('id') userId: string, @Req() req: Request) {
    const agentId = req['agent'].agentId;
    return this.agentDashboardService.getCustomerById(agentId, userId);
  }

  @Get('user/:id/appointments')
  @UseGuards(AgentJwtAuthGuard)
  async getUserAppointments(
    @Param('id') userId: string,
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const agentId = req['agent'].agentId;
    return this.agentDashboardService.getUserAppointments(agentId, 
        userId,
        Number(page),
        Number(limit),
      );
  }

  @Get('me')
  @UseGuards(AgentJwtAuthGuard)
  async getAgent(@Req() req: Request) {
    const agentId = req['agent'].agentId;
    const agent = await this.agentDashboardService.getAgent(agentId);
    return agent;
  }
}