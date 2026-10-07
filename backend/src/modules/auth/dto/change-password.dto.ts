import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword123!',
    description: 'Current password of the user',
  })
  @IsString()
  oldPassword!: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'New password (must be at least 6 characters)',
  })
  @IsString()
  newPassword!: string;
}

export class VerifyForgottenPasswordOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP sent to the user email',
  })
  @IsString({ message: 'OTP must be a string' })
  @IsNotEmpty({ message: 'OTP is required' })
  otp!: string;

  @ApiProperty({
    example: 'StrongPassword123!',
    description: 'New password',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  newPassword!: string;
}
