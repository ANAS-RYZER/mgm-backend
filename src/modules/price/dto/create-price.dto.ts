import { IsString, IsNotEmpty, IsNumber, Min, IsEnum } from 'class-validator';
import { MetalType } from '../schemas/price.schema';

export class CreatePriceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(MetalType)
  @IsNotEmpty()
  type: MetalType;
}

