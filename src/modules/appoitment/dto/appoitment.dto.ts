
import { IsArray, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum SlotCode {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
}

export class CreateAppointmentDto {
  @IsDateString()
  date: string;

  @IsEnum(SlotCode)
  slotCode: SlotCode;



  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];
}
