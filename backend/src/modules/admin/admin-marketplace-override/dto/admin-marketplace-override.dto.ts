import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { MarketplaceOverrideTypeValue } from 'src/modules/task/market-algoritm/marketplace-override.service';

import { PartialType } from '@nestjs/swagger';

export class CreateMarketplaceOverrideDto {
  @IsOptional()
  @IsString()
  websiteId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsEnum([
    'BOOST',
    'SUPPRESS',
    'FORCE_MATCH',
    'SCORE_OVERRIDE',
    'PENALTY',
    'LIMIT_BYPASS',
    'RISK_BYPASS',
    'PRIORITY',
    'MANUAL_ASSIGNMENT',
    'RESTRICTION',
  ])
  type!: MarketplaceOverrideTypeValue;

  @IsOptional()
  @IsNumber()
  boostValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  visibilityScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  opportunityScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  reputationScore?: number;

  @IsOptional()
  @IsBoolean()
  forceMatchNext?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  suppressUntil?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  activeUntil?: Date;

  @IsString()
  reasonCode!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RevokeMarketplaceOverrideDto {
  @IsString()
  reason!: string;
}

export class UpdateMarketplaceOverrideDto extends PartialType(CreateMarketplaceOverrideDto) {}
