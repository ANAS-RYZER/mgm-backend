import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Categories, ProductStatus } from "../interfaces/product.interface";
import { StoneDetailsDto } from "./stone-details.dto";
import { Type } from "class-transformer";
import { GoldSpecsDto } from "./gold-specs.dto";

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  mrpPrice?: number;

  @IsOptional()
  @IsNumber()
  discountedPercentage?: number;

  @IsOptional()
  @IsNumber()
  discountedPrice?: number;

  @IsOptional()
  @IsNumber()
  goldPrice?: number;

  @IsOptional()
  @IsNumber()
  multiplestonePrice?: number;

  @IsOptional()
  @IsNumber()
  grossPrice?: number;

  @IsOptional()
  @IsNumber()
  netWeight?: number;

  @IsOptional()
  @IsNumber()
  cgst?: number;

  @IsOptional()
  @IsNumber()
  sgst?: number;

  @IsOptional()
  @IsNumber()
  va?: number;

  @IsOptional()
  @IsNumber()
  makingChanges?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @IsOptional()
  @IsEnum(Categories)
  categories?: Categories;

  @IsOptional()
  @ValidateNested()
  @Type(() => GoldSpecsDto)
  goldSpecs?: GoldSpecsDto;

  @IsOptional()
  @IsString()
  netPrice?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoneDetailsDto)
  stoneSpecs?: StoneDetailsDto[];

  @IsOptional()
  @IsString()
  uploadRefId?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsNumber()
  commissionPercentage?: number;
}