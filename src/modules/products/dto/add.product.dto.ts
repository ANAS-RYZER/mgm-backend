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

 
}
