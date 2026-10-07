import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BadgeCategory,
  BadgeRewardType,
  BadgeRoleScope,
  BadgeScope,
  BadgeTriggerType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBadgeDefinitionDto {
  @ApiProperty({ example: 'HIGH_APPROVAL' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'High Approval' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Provider keeps a high approval rate.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: BadgeCategory, default: BadgeCategory.MARKETPLACE })
  @IsOptional()
  @IsEnum(BadgeCategory)
  category?: BadgeCategory;

  @ApiPropertyOptional({ example: 'Maintain 90% approval rate over 10+ reviews.' })
  @IsOptional()
  @IsString()
  requirementText?: string;

  @ApiPropertyOptional({ example: 'Visibility boost in marketplace.' })
  @IsOptional()
  @IsString()
  rewardImpactText?: string;

  @ApiPropertyOptional({ enum: BadgeScope, default: BadgeScope.USER_PROFILE })
  @IsOptional()
  @IsEnum(BadgeScope)
  badgeScope?: BadgeScope;

  @ApiPropertyOptional({ enum: BadgeRoleScope, default: BadgeRoleScope.ANY })
  @IsOptional()
  @IsEnum(BadgeRoleScope)
  roleScope?: BadgeRoleScope;

  @ApiProperty({ enum: BadgeTriggerType })
  @IsEnum(BadgeTriggerType)
  triggerType!: BadgeTriggerType;

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

  @ApiPropertyOptional({ example: false, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPersistent?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: BadgeRewardType, default: BadgeRewardType.RECOGNITION_ONLY })
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
