import { IsOptional, IsArray, IsString, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../schema/order.schema';


class BreakdownDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePriceTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  vaTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  makingTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grossTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxableTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cgstTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sgstTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grandTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  commission?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  adminRevenue?: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productSku?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => BreakdownDto)
  breakdown?: BreakdownDto;
}
