import { IsEmail, IsString, IsOptional } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}

