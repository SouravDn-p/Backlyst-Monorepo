import { ApiPropertyOptional } from '@nestjs/swagger';
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

export enum AuditActionType {
  ESCROW_REVERSAL = 'ESCROW_REVERSAL',
  VISIBILITY_OVERRIDE = 'VISIBILITY_OVERRIDE',
  CREDIT_ADJUSTMENT = 'CREDIT_ADJUSTMENT',
  SYSTEM_THRESHOLD_UPDATE = 'SYSTEM_THRESHOLD_UPDATE',
  ALL = 'ALL',
}

export enum AuditRegistryImpact {
  CREDIT = 'CREDIT',
  VISIBILITY = 'VISIBILITY',
  SYSTEM = 'SYSTEM',
  ALL = 'ALL',
}

export enum AuditSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO',
  ALL = 'ALL',
}

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AdminForensicAuditQueryDto {
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

  @ApiPropertyOptional({ enum: AuditActionType, example: AuditActionType.ALL })
  @IsOptional()
  @IsEnum(AuditActionType)
  actionType?: AuditActionType = AuditActionType.ALL;

  @ApiPropertyOptional({ enum: AuditRegistryImpact, example: AuditRegistryImpact.ALL })
  @IsOptional()
  @IsEnum(AuditRegistryImpact)
  registryImpact?: AuditRegistryImpact = AuditRegistryImpact.ALL;

  @ApiPropertyOptional({ enum: AuditSeverity, example: AuditSeverity.ALL })
  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity = AuditSeverity.ALL;

  @ApiPropertyOptional({ example: 'TECHCRUNCH.COM' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2024-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
