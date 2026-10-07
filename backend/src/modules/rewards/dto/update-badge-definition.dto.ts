import { ApiPropertyOptional } from '@nestjs/swagger';
import { BadgeRewardType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateBadgeDefinitionDto {
  @ApiPropertyOptional({ example: 'High Approval' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Provider keeps a high approval rate.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Maintain 90% approval over 10+ reviews.' })
  @IsOptional()
  @IsString()
  requirementText?: string;

  @ApiPropertyOptional({ example: 'Visibility boost in marketplace.' })
  @IsOptional()
  @IsString()
  rewardImpactText?: string;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  threshold?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  secondaryThreshold?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPersistent?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: BadgeRewardType })
  @IsOptional()
  @IsEnum(BadgeRewardType)
  rewardType?: BadgeRewardType;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rewardValue?: number;

  @ApiPropertyOptional({
    example: { multiplier: 1.2, consumer: 'MARKETPLACE_VISIBILITY' },
  })
  @IsOptional()
  @IsObject()
  rewardMeta?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  validityDays?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  refreshWindowDays?: number;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  gracePeriodDays?: number;
}
