import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum RequesterDashboardRange {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  ALL = 'all',
}

export class GetRequesterDashboardSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Requester website ID to filter by.' })
  @IsOptional()
  @IsString()
  websiteId?: string;

  @ApiPropertyOptional({
    enum: RequesterDashboardRange,
    default: RequesterDashboardRange.THIRTY_DAYS,
  })
  @IsOptional()
  @IsEnum(RequesterDashboardRange)
  range?: RequesterDashboardRange = RequesterDashboardRange.THIRTY_DAYS;

  @ApiPropertyOptional({ description: 'Custom range start date.' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Custom range end date.' })
  @IsOptional()
  @IsString()
  to?: string;
}
