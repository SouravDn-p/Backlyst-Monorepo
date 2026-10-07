import { ApiPropertyOptional } from '@nestjs/swagger';
import { RewardAuditActorType, RewardAuditStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RewardAuditQueryDto {
  @ApiPropertyOptional({ example: 'BADGE_MANUALLY_ASSIGNED' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  action?: string;

  @ApiPropertyOptional({ enum: RewardAuditActorType })
  @IsOptional()
  @IsEnum(RewardAuditActorType)
  actorType?: RewardAuditActorType;

  @ApiPropertyOptional({ example: 'admin-id' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ example: 'user-id' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  targetUserId?: string;

  @ApiPropertyOptional({ example: 'badge-id' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  badgeDefinitionId?: string;

  @ApiPropertyOptional({ example: 'benefit-id' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  rewardBenefitId?: string;

  @ApiPropertyOptional({ example: 'outbox-id' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  rewardOutboxId?: string;

  @ApiPropertyOptional({ enum: RewardAuditStatus })
  @IsOptional()
  @IsEnum(RewardAuditStatus)
  status?: RewardAuditStatus;

  @ApiPropertyOptional({ example: 'ADMIN_PANEL' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'founding member' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-07-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

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
