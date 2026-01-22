import { IsNotEmpty, IsString } from 'class-validator';

export class AdminRefreshTokenDto {
  @IsNotEmpty({ message: 'Session ID is required' })
  @IsString({ message: 'Session ID must be a string' })
  sessionId: string;
}

