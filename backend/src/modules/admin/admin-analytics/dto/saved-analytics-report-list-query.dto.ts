import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  AnalyticsReportStatus,
  AnalyticsReportType,
  SavedReportSortBy,
  SortOrder,
} from '../enums/analytics.enums';

export class SavedAnalyticsReportListQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'June' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: AnalyticsReportType,
    enumName: 'AnalyticsReportType',
  })
  @IsOptional()
  @IsEnum(AnalyticsReportType)
  reportType?: AnalyticsReportType;

  @ApiPropertyOptional({
    enum: AnalyticsReportStatus,
    enumName: 'AnalyticsReportStatus',
  })
  @IsOptional()
  @IsEnum(AnalyticsReportStatus)
  status?: AnalyticsReportStatus;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  generatedFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z' })
  @IsOptional()
  @IsISO8601()
  generatedTo?: string;

  @ApiPropertyOptional({
    enum: SavedReportSortBy,
    default: SavedReportSortBy.GENERATED_AT,
  })
  @IsOptional()
  @IsEnum(SavedReportSortBy)
  sortBy?: SavedReportSortBy = SavedReportSortBy.GENERATED_AT;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
