import { IsArray, IsEnum,  IsNotEmpty,  IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import {
  Categories,
  ProductStatus,
} from "../interfaces/product.interface";
import { StoneDetailsDto } from "./stone-details.dto";
import { Type } from "class-transformer";
import { GoldSpecsDto } from "./gold-specs.dto";

export class UpdateProductDto {
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
