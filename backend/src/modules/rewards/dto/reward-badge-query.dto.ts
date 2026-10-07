import { ApiPropertyOptional } from '@nestjs/swagger';
import { BadgeCategory, UserBadgeStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
export class RewardBadgeQueryDto {
  @ApiPropertyOptional({ enum: UserBadgeStatus })
  @IsOptional()
  @IsEnum(UserBadgeStatus)
  status?: UserBadgeStatus;
  @ApiPropertyOptional({ enum: BadgeCategory })
  @IsOptional()
  @IsEnum(BadgeCategory)
  category?: BadgeCategory;
}
