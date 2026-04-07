import { Controller, Get, Query, UseGuards, Param } from "@nestjs/common";
import { AdminCommissionService } from "./agentCommission.service";
import { AdminJwtAuthGuard } from "../../admins/guards/admin-jwt-auth.guard";

@Controller("admin/commissions")
export class AdminCommissionController {
  constructor(
    private readonly adminCommissionService: AdminCommissionService,
  ) {}

  @Get()
  @UseGuards(AdminJwtAuthGuard)
  async getAllCommissions(
    @Query("search") search?: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.adminCommissionService.getAllCommissions(
      search,
      Number(page),
      Number(limit),
    );
  }

  @Get("/:orderId")
  @UseGuards(AdminJwtAuthGuard)
    async getCommissionDetails(@Param("orderId") orderId: string) {
    return this.adminCommissionService.getCommissionDetails(orderId);
    }

  @Get("dashboard/:agentId")
  @UseGuards(AdminJwtAuthGuard)
  async getDashboard(@Param("agentId") agentId: string) {
    const data = await this.adminCommissionService.getAgentDashboard(agentId);
    console.log("data", data)
    return {
      success: true,
      data,
    };
  }  
}