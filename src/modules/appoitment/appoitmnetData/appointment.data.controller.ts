import { Body, Controller, Get, Post, Query, Req, UseGuards, Param, Patch, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { AppoitmenDatatService } from './appointment.data.service';
import { AgentJwtAuthGuard } from 'src/modules/agents/guards/agent-jwt-auth.guard';
import { AdminJwtAuthGuard } from 'src/modules/admins/guards/admin-jwt-auth.guard';
import {AppointmentStatus} from '../dto/appoitment.dto';

@Controller("dashboard")
export class AppoitmentDataController {
  constructor(private readonly service: AppoitmenDatatService) {}

  @Get("appointment")
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getAdminAppointment(
    @Query("search") search?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "10",
  ) {
    return this.service.getAdminAppointment(
      search,
      Number(page),
      Number(limit),
    );
  }


  @Get("agent")
  @UseGuards(AgentJwtAuthGuard)
  async getagentsAppointment(@Req() req: Request) {
    const agentId = (req as any).agent?.agentId ?? "";
    const agentReferralCode = (req as any).agentReferralCode ?? "";
    const data = await this.service.getAgentAppointments(
      agentId,
      agentReferralCode,
    );
    console.log(data, "data");
    return { data };
  }

  @Get('admin/appointment/:id')
  @UseGuards(AdminJwtAuthGuard)
  async getAdminAppointmentById(@Param('id') id: string) {
      return this.service.getAppointmentsById(id);
    }

  @Patch(':id/status')
  @UseGuards(AdminJwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: AppointmentStatus,
  ) {
  const updatedAppointment =
    await this.service.updateAppointmentStatus(id, status);

  return {
    success: true,
    message: 'Appointment status updated successfully',
    data: updatedAppointment,
  };
}
}
