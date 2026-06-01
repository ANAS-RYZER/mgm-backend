import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import type { DashboardRange } from './admin-dashboard.service';

@Controller('admin-dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('summary')
  @UseGuards(AdminJwtAuthGuard)
  async getSummaryCards() {
    const data = await this.adminDashboardService.getSummaryCards();
    return {
      success: true,
      message: 'Dashboard summary fetched successfully',
      data,
    };
  }

  @Get('top-products')
  @UseGuards(AdminJwtAuthGuard)
  async getTopProducts(@Query('limit') limit?: string) {
    const parsed = limit != null ? Number(limit) : 5;
    const effectiveLimit =
      Number.isFinite(parsed) && parsed > 0 ? parsed : 5;

    const data = await this.adminDashboardService.getTopProducts(effectiveLimit);
    return {
      success: true,
      message: 'Top products fetched successfully',
      data,
    };
  }

  @Get('commission-summary')
  @UseGuards(AdminJwtAuthGuard)
  async getCommissionSummary() {
    const data = await this.adminDashboardService.getCommissionSummary();
    return {
      success: true,
      message: 'Commission summary fetched successfully',
      data,
    };
  }

  @Get('sales-overview')
  @UseGuards(AdminJwtAuthGuard)
  async getSalesOverview(@Query('range') range?: string) {
    const data = await this.adminDashboardService.getSalesOverview(
      (range as DashboardRange) || 'this_week',
    );
    return {
      success: true,
      message: 'Sales overview fetched successfully',
      data,
    };
  }
}
