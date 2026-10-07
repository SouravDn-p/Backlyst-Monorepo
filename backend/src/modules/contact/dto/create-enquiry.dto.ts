import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnquiryDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'johndoe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'Tech Corp' })
  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Need help with placement' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ example: 'Hello, I wanted to know about...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;
}