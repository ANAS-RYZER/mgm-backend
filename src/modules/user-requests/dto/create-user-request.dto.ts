import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';

import { GemCut } from '../../products/interfaces/product.interface';

export class CreateUserRequestDto {
  @IsString()
  @IsNotEmpty()
  image: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsNotEmpty()
  metal?: string;

  @IsString()
  @IsOptional()
  goldKarat?: string;

  @IsString()
  @IsOptional()
  stoneName?: string;

  @IsEnum(GemCut)
  @IsOptional()
  stoneCut?: GemCut;

  @IsString()
  @IsOptional()
  stoneKarat?: string;

  @IsString()
  @IsOptional()
  agentReferralCode?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

