import { ApiPropertyOptional } from '@nestjs/swagger';
import { RewardLedgerType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
export class RewardLedgerQueryDto {
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
  @ApiPropertyOptional({ enum: RewardLedgerType, description: 'Alias of ledger event type' })
  @IsOptional()
  @IsEnum(RewardLedgerType)
  rewardType?: RewardLedgerType;
  @ApiPropertyOptional({ enum: RewardLedgerType })
  @IsOptional()
  @IsEnum(RewardLedgerType)
  type?: RewardLedgerType;
  @ApiPropertyOptional({ example: 'HIGH_APPROVAL' })
  @IsOptional()
  @IsString()
  rewardCode?: string;
  @ApiPropertyOptional({ example: 'badge-definition-id' })
  @IsOptional()
  @IsUUID()
  badgeDefinitionId?: string;
  @ApiPropertyOptional({ example: 'search text' })
  @IsOptional()
  @IsString()
  search?: string;
  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;
  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
export class AdminRewardLedgerQueryDto extends RewardLedgerQueryDto {
  @ApiPropertyOptional({ example: 'ca37a9f9-b3aa-4f48-a956-570eb91149d2' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
