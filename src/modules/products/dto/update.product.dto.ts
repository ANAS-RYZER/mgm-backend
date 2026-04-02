import { IsEnum,  IsNumber, IsOptional, IsString } from "class-validator";
import {
  Categories,
  ProductStatus,
} from "../interfaces/product.interface";

export class UpdateProductDto {
  @IsOptional()  
  @IsString()
  sku?: string;
    
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  mrpPrice?: number;

  @IsOptional()
  @IsNumber()
  discountedPrice?: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  gallery?: string[];

  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @IsOptional()
  @IsEnum(Categories)
  categories?: Categories;

  @IsOptional()
  goldSpecs?: any;

  @IsOptional()
  stoneSpecs?: any[];

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsNumber()
  commissionPercentage?: number;
}
