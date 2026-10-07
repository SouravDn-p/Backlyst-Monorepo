import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class AdminAssignBadgeDto {
  @ApiPropertyOptional({ example: 'badge-id' })
  @IsOptional()
  @IsUUID()
  badgeId?: string;

  @ApiPropertyOptional({ example: 'FOUNDING_MEMBER' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  badgeCode?: string;

  @ApiPropertyOptional({ example: 'Kickstarter founding backer' })
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiPropertyOptional({
    example: {
      kickstarterTier: 'Founding Member',
      backerReference: 'KS-123',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overridePerformanceBadge?: boolean = false;
}
