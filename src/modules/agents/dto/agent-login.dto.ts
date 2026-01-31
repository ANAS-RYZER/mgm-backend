import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AgentLoginDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

