import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class GetProviderDashboardSummaryQueryDto {
  @ApiPropertyOptional({
    example: '44a0874c-0f3a-4c9a-8cd0-e9644c7567cf',
    description: 'Filter dashboard metrics to a single provider-owned website.',
  })
  @IsOptional()
  @IsUUID()
  websiteId?: string;

  @ApiPropertyOptional({
    enum: ['7d', '30d', '90d', 'all'],
    example: '30d',
  })
  @IsOptional()
  @IsIn(['7d', '30d', '90d', 'all'])
  range?: '7d' | '30d' | '90d' | 'all';

  @ApiPropertyOptional({
    example: '2026-05-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-06-01T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
