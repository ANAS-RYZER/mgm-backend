import { Controller, Get, Param, Req, UnauthorizedException, UseGuards, Query } from "@nestjs/common";
import { AgentDashboardService } from "./agent.dashboard.service";
import { AgentJwtAuthGuard } from "../guards/agent-jwt-auth.guard";
import type { Request } from "express";

@Controller('agent-dashboard')
export class AgentDashboardController {
  constructor(private readonly agentDashboardService: AgentDashboardService) {}
  @Get('customers')
  @UseGuards(AgentJwtAuthGuard) 
  async getCustomers(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const agentId = req['agent'].agentId;

    const customers =
      await this.agentDashboardService.getCustomersByAgentId(
        agentId,
        search,
        Number(page),
        Number(limit),
      );

    return customers;
  }

  @Get('customer/:customerId')
  @UseGuards(AgentJwtAuthGuard)
  async getCustomerDetails(
    @Param('customerId') customerId: string,
    @Req() req: Request,
  ) {
    const agentId = req['agent'].agentId;

    const data = await this.agentDashboardService.getCustomerDetails(
      customerId,
      agentId,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('customer/:customerId/appointments')
  @UseGuards(AgentJwtAuthGuard)
  async getCustomerAppointments(
    @Param('customerId') customerId: string,
    @Req() req: Request,
  ) {
    const agentId = req['agent'].agentId;

    const data = await this.agentDashboardService.getCustomerAppointments(
      customerId,
      agentId,
    );

    return {
      success: true,
      count: data.length,
      data,
    };
  }

  @Get('customer/:customerId/orders')
  @UseGuards(AgentJwtAuthGuard)
  async getCustomerOrders(
    @Param('customerId') customerId: string,
    @Req() req: Request,
  ) {
    const agentId = req['agent'].agentId;

    const data =
      await this.agentDashboardService.getCustomerOrders(
        customerId,
        agentId,
      );

    return {
      success: true,
      count: data.length,
      data,
    };
  }

  @Get('customer-count')
  @UseGuards(AgentJwtAuthGuard)
  async getCustomerCount(@Req() req: Request) {
    const agentId = req['agent'].agentId;

    return this.agentDashboardService.getCustomerCountByAgentId(agentId);
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
    const commissionSummary =
      await this.agentDashboardService.getCommissionSummary(agentId);
    return {
      agent,
      commissionSummary,
    };
  }

  @Get("commission")
  @UseGuards(AgentJwtAuthGuard)
  async getMyCommissions(
    @Req() req: Request,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    const agentId = req["agent"].agentId;
    return this.agentDashboardService.getMyCommissions(agentId, page, limit);
  }
}