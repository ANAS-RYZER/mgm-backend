import { IsString, IsEmail, IsNotEmpty, IsDateString, ValidateNested, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class BankDetailsDto {
  @IsString()
  @IsNotEmpty()
  accountHolderName: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  ifscCode: string;

  @IsString()
  @IsNotEmpty()
  accountType: string;

  @IsString()
  branchName?: string;
}

class GovernmentIdDto {
  @IsEnum(['PAN', 'AADHAAR'])
  type: 'PAN' | 'AADHAAR';

  @IsString()
  @IsNotEmpty()
  documentUrl: string;
}

export class RegisterAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsDateString()
  @IsNotEmpty()
  dob: string;

  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails: BankDetailsDto;

  @ValidateNested()
  @Type(() => GovernmentIdDto)
  governmentId: GovernmentIdDto;

  @IsOptional()
  @IsBoolean()
  isadmin?: boolean;
}

