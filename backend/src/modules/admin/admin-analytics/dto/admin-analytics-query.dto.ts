import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import {
  AnalyticsDataSource,
  AnalyticsMetric,
  AnalyticsParticipant,
  AnalyticsRange,
} from '../enums/analytics.enums';

export class AdminAnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsRange,
    enumName: 'AnalyticsRange',
    default: AnalyticsRange.MONTHLY,
    description:
      'UTC date range. CUSTOM requires both from and to. DAILY/WEEKLY/MONTHLY/YEARLY use current UTC period.',
  })
  @IsOptional()
  @IsEnum(AnalyticsRange)
  range?: AnalyticsRange = AnalyticsRange.MONTHLY;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({
    enum: AnalyticsParticipant,
    enumName: 'AnalyticsParticipant',
    default: AnalyticsParticipant.ALL,
    description:
      'Activity-role filter. REQUESTER uses task requester activity; PROVIDER uses application/selected-provider activity. Some platform-wide metrics explain when this filter is not applied.',
  })
  @IsOptional()
  @IsEnum(AnalyticsParticipant)
  participant?: AnalyticsParticipant = AnalyticsParticipant.ALL;
}

export class AdminAnalyticsRegistryQueryDto extends AdminAnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsMetric,
    enumName: 'AnalyticsMetric',
    default: AnalyticsMetric.ALL,
  })
  @IsOptional()
  @IsEnum(AnalyticsMetric)
  metric?: AnalyticsMetric = AnalyticsMetric.ALL;

  @ApiPropertyOptional({
    enum: AnalyticsDataSource,
    enumName: 'AnalyticsDataSource',
    default: AnalyticsDataSource.ALL,
  })
  @IsOptional()
  @IsEnum(AnalyticsDataSource)
  source?: AnalyticsDataSource = AnalyticsDataSource.ALL;
}

export class AnalyticsPeriodDto {
  @ApiProperty({ example: 'MONTHLY' })
  range: string;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  from: string;

  @ApiProperty({ example: '2026-06-30T23:59:59.999Z' })
  to: string;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  previousFrom: string;

  @ApiProperty({ example: '2026-05-31T23:59:59.999Z' })
  previousTo: string;
}

export class AdminAnalyticsGenericResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Admin analytics fetched successfully' })
  message: string;

  @ApiProperty({ type: Object })
  data: Record<string, unknown>;
}
