import { IsEnum, IsNotEmpty } from "class-validator";
import { DiamondColor, GemstoneColor } from "../interfaces/product.interface";

export class ColorDto {
  @IsEnum(["DIAMOND", "GEMSTONE"])
  type: "DIAMOND" | "GEMSTONE";

  @IsNotEmpty()
  value: DiamondColor | GemstoneColor;
}
