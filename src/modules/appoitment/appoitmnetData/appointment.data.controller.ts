import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AppoitmenDatatService } from './appointment.data.service';


@Controller('dashboard')
export class AppoitmentDataController {
  constructor(private readonly service: AppoitmenDatatService) {}

  @Get('appointment')
  getAdminAppointment(){

    return this.service.getAdminAppointment();

      
  }
 
}
