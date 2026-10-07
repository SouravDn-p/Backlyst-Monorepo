import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReferralAttributionStatus, ReferralSource } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminReferralConversionFilter {
  FREE_TO_PAID = 'FREE_TO_PAID',
  PENDING = 'PENDING',
  NO_CONVERSION = 'NO_CONVERSION',
}

export class AdminReferralRegistryQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: ReferralAttributionStatus,
    example: ReferralAttributionStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ReferralAttributionStatus)
  status?: ReferralAttributionStatus;

  @ApiPropertyOptional({
    enum: AdminReferralConversionFilter,
    example: AdminReferralConversionFilter.FREE_TO_PAID,
  })
  @IsOptional()
  @IsEnum(AdminReferralConversionFilter)
  conversion?: AdminReferralConversionFilter;

  @ApiPropertyOptional({
    enum: ReferralSource,
    example: ReferralSource.DIRECT_REFERRAL,
  })
  @IsOptional()
  @IsEnum(ReferralSource)
  source?: ReferralSource;

  @ApiPropertyOptional({
    example: 'initech',
    description:
      'Search by referrer name/email, referred name/email, website name, or referral code.',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
