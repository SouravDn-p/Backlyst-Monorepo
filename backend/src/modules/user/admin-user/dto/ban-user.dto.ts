import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class BanUserDto {
  @ApiProperty({
    example: 'Violation of community guidelines',
    description: 'Reason for banning the user',
    maxLength: 255,
  })
  @IsString({ message: 'Reason must be a string' })
  @IsNotEmpty({ message: 'Reason is required' })
  @MaxLength(255, { message: 'Reason cannot exceed 255 characters' })
  reason: string;
}
