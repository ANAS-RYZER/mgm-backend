import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { MetalType } from '../schemas/price.schema';

export class UpdatePriceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;
}

