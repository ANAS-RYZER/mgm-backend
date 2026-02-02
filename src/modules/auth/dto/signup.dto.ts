import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsOptional()
  fullName?: string;

  @IsOptional()
  refId?: string;
}

