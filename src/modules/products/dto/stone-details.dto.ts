import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, ValidateNested } from "class-validator";
import { DiamondClarity, GemCut } from "../interfaces/product.interface";
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

  @ValidateNested()
  @Type(() => ColorDto)
  color: ColorDto;
}
