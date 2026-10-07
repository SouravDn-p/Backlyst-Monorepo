import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveWebsiteScreenshotVerificationDto {
  @ApiProperty({
    example: 'website_123',
    description: 'Website ID to be approved',
  })
  @IsString()
  @IsNotEmpty()
  websiteId!: string;

  @ApiPropertyOptional({
    example: 'Screenshot matches the website homepage.',
    description: 'Optional admin notes during approval',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  manualReviewNotes?: string;
}

export class RejectWebsiteScreenshotVerificationDto {
  @ApiProperty({
    example: 'website_123',
    description: 'Website ID to be rejected',
  })
  @IsString()
  @IsNotEmpty()
  websiteId!: string;

  @ApiProperty({
    example: 'Screenshot does not match the website homepage content',
    description: 'Reason for rejecting the verification request',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  rejectionReason!: string;

  @ApiPropertyOptional({
    example: 'Manual review failed due to mismatch in branding section',
    description: 'Optional internal admin notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  manualReviewNotes?: string;
}
