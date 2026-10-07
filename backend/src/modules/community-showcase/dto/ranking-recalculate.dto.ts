import { ApiPropertyOptional } from '@nestjs/swagger';
import { RankingPeriod, ShowcaseEntityType, ShowcaseSection } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class RankingRecalculateDto {
  @ApiPropertyOptional({ enum: ShowcaseSection })
  @IsOptional()
  @IsEnum(ShowcaseSection)
  section?: ShowcaseSection;

  @ApiPropertyOptional({ enum: RankingPeriod })
  @IsOptional()
  @IsEnum(RankingPeriod)
  period?: RankingPeriod;

  @ApiPropertyOptional({ enum: ShowcaseEntityType })
  @IsOptional()
  @IsEnum(ShowcaseEntityType)
  entityType?: ShowcaseEntityType;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
