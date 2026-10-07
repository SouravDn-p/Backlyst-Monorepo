import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyWebsiteByScreenshotDto {
  @ApiProperty({
    example: '1234567890',
    description: 'Website ID to be verified',
  })
  @IsString()
  @IsNotEmpty()
  websiteId!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/uploads/verification-screenshot.png',
    description:
      'Screenshot image URL generated after backend uploads the received file to S3.',
  })
  @IsString()
  @IsOptional()
  screenshotImageKey?: string;
}

