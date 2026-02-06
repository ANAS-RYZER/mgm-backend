import { Transform, Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { DiamondClarity, GemCut, StoneType } from "../interfaces/product.interface";
import { ColorDto } from "./color.dto";

export class StoneDetailsDto {
  @IsNotEmpty()
  stoneName: string;

  @IsNumber()
  quantity: number;

  @IsEnum(GemCut)
  cut: GemCut;

  @IsOptional()
  @IsEnum(DiamondClarity)
  clarity?: DiamondClarity;

  @IsOptional()
  @IsString()
  type?: StoneType;

  @Transform(({ value }) =>
    typeof value === "string"
      ? { type: "DIAMOND" as const, value }
      : value,
  )
  @ValidateNested()
  @Type(() => ColorDto)
  color: ColorDto;

  @IsOptional()
  @IsNumber()
  price?: number;
  
  @IsOptional()
  @IsString()
  diamondType?: string;
}
