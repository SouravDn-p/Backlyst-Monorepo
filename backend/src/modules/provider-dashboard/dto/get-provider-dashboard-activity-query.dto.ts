import { TaskFlowEventType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class GetProviderDashboardActivityQueryDto {
  @ApiPropertyOptional({
    example: '44a0874c-0f3a-4c9a-8cd0-e9644c7567cf',
  })
  @IsOptional()
  @IsUUID()
  websiteId?: string;

  @ApiPropertyOptional({
    enum: TaskFlowEventType,
  })
  @IsOptional()
  @IsEnum(TaskFlowEventType)
  eventType?: TaskFlowEventType;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

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
