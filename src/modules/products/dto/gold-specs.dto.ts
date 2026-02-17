import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class GoldSpecsDto {
  @IsString()
  karat: string; // ex: "22K"



  @IsNumber()
  goldWeight: number;

  @IsNumber()
  makingCharges: number;

  @IsString()
  metal: string; // ex: "Gold"

}
