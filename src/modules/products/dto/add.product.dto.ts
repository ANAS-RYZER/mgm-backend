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
} from "../interfaces/product.interface";

import { StoneDetailsDto } from "./stone-details.dto";
import { GoldSpecsDto } from "./gold-specs.dto";


export class AddProductDto {
  @IsOptional()
  @IsString()

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
  discountedPercentage?: number;

  @IsOptional()
  @IsNumber()
  netprice?: number;

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
  gallery?: string[];

  @IsNumber()
  stockQuantity: number;

  @IsEnum(Categories)
  categories: Categories;

  @ValidateNested()
  @Type(() => GoldSpecsDto)
  goldSpecs: GoldSpecsDto;

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
}
