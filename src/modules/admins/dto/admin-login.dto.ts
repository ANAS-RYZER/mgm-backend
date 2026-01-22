import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { IsRyzerEmail } from '../validators/is-ryzer-email.validator';

export class AdminLoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsRyzerEmail({ message: 'Admin email must be from @ryzer.app domain' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

