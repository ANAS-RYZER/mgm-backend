import {
  IsString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import {
  RequestStatus,
} from '../schemas/user-request.schema';
import { GemCut } from '../../products/interfaces/product.interface';

export class UpdateUserRequestDto {
  @IsString()
  @IsOptional()
  agentReferralCode?: string;

  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

