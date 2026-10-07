import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class TempPasswordResetDto {
  @ApiProperty({
    example: 'user@example.com',
    description:
      'Email of the account whose password needs temporary recovery.',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    example: 'NewStrongPassword123!',
    description: 'New password to set for the account.',
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(6)
  newPassword!: string;
}
