import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  AnalyticsParticipant,
  AnalyticsRange,
  AnalyticsReportType,
} from '../enums/analytics.enums';

export class CreateSavedAnalyticsReportDto {
  @ApiPropertyOptional({
    example: 'June Full Platform Summary',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    example: 'Monthly admin analytics report',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    enum: AnalyticsReportType,
    enumName: 'AnalyticsReportType',
    example: AnalyticsReportType.FULL_PLATFORM_SUMMARY,
  })
  @IsEnum(AnalyticsReportType)
  reportType: AnalyticsReportType;

  @ApiPropertyOptional({
    enum: AnalyticsRange,
    enumName: 'AnalyticsRange',
    default: AnalyticsRange.MONTHLY,
  })
  @IsOptional()
  @IsEnum(AnalyticsRange)
  range?: AnalyticsRange = AnalyticsRange.MONTHLY;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @ValidateIf(
    (dto) => dto.range === AnalyticsRange.CUSTOM || dto.from || dto.to,
  )
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z' })
  @ValidateIf(
    (dto) => dto.range === AnalyticsRange.CUSTOM || dto.from || dto.to,
  )
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({
    enum: AnalyticsParticipant,
    enumName: 'AnalyticsParticipant',
    default: AnalyticsParticipant.ALL,
  })
  @IsOptional()
  @IsEnum(AnalyticsParticipant)
  participant?: AnalyticsParticipant = AnalyticsParticipant.ALL;
}
