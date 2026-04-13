import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AppoitmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/appoitment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('appointments')
export class AppoitmentController {
  constructor(private readonly service: AppoitmentService) {}

  @Get('slots')
  getSlots(@Query('date') date: string) {
    return this.service.getSlots(date);
  }

  
 

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateAppointmentDto ,     @Req() req: any,
) {
    const userId = req.user?.userId;
    console.log(userId , "user id")
    return this.service.createAppointment(dto , userId);
  }

  @Get()
@UseGuards(JwtAuthGuard)
async getUserAppointments(
  @Req() req: any,
  @Query('filter') filter: string = 'all',
) {
  const userId = req.user?.userId;

  const cleanFilter = (filter || 'all').trim().toLowerCase() as
    | 'all'
    | 'upcoming'
    | 'history';

  return this.service.getAppointmentsByUser(userId, cleanFilter);
}
}
