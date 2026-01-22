import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Full name must be a string' })
  fullName?: string;

  @IsOptional()
  @IsString({ message: 'Avatar must be a string' })
  @IsUrl({}, { message: 'Avatar must be a valid URL' })
  avatar?: string;
}

