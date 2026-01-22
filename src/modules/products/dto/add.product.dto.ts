import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import {
  Categories,
  ProductStatus,
} from "../interfaces/product.interface";

import { StoneDetailsDto } from "./stone-details.dto";
import { GoldSpecsDto } from "./gold-specs.dto";


export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  mrpPrice: number;

  @IsOptional()
  @IsNumber()
  discountedPrice?: number;

  @IsOptional()
  @IsArray()
  gallery?: string[];

  @IsNumber()
  stockQuantity: number;

  @IsEnum(Categories)
  categories: Categories;

  @ValidateNested()
  @Type(() => GoldSpecsDto)
  goldSpecs: GoldSpecsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoneDetailsDto)
  stoneSpecs?: StoneDetailsDto[];

  @IsEnum(ProductStatus)
  status: ProductStatus;
}
