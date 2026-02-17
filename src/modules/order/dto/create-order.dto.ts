import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../schema/order.schema';

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
}
