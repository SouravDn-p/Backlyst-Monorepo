import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendRegistrationVerifyOtpDto {
  @IsEmail()
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email!: string;
}
