import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShowcaseEntityType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ShowcaseStatsRefreshDto {
  @ApiPropertyOptional({ enum: ShowcaseEntityType })
  @IsOptional()
  @IsEnum(ShowcaseEntityType)
  entityType?: ShowcaseEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
