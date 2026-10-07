import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  BadgeCategory,
  BadgeRewardType,
  BadgeRoleScope,
  BadgeTriggerType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
export class AdminBadgeListQueryDto {
  @ApiPropertyOptional({ enum: BadgeCategory })
  @IsOptional()
  @IsEnum(BadgeCategory)
  category?: BadgeCategory;
  @ApiPropertyOptional({ enum: BadgeRoleScope })
  @IsOptional()
  @IsEnum(BadgeRoleScope)
  roleScope?: BadgeRoleScope;
  @ApiPropertyOptional({ enum: BadgeRewardType })
  @IsOptional()
  @IsEnum(BadgeRewardType)
  rewardType?: BadgeRewardType;
  @ApiPropertyOptional({ enum: BadgeTriggerType })
  @IsOptional()
  @IsEnum(BadgeTriggerType)
  triggerType?: BadgeTriggerType;
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional({ example: 'approval' })
  @IsOptional()
  @IsString()
  search?: string;
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
  @ApiPropertyOptional({ example: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
