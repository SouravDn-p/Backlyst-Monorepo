import { ApiPropertyOptional } from '@nestjs/swagger';
import { RankingPeriod, ShowcaseEntityType, ShowcaseSection } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CommunityShowcaseQueryDto {
  @ApiPropertyOptional({ enum: ShowcaseSection })
  @IsEnum(ShowcaseSection)
  section!: ShowcaseSection;

  @ApiPropertyOptional({ enum: RankingPeriod, default: RankingPeriod.ALL_TIME })
  @IsOptional()
  @IsEnum(RankingPeriod)
  period?: RankingPeriod;

  @ApiPropertyOptional({ enum: ShowcaseEntityType })
  @IsOptional()
  @IsEnum(ShowcaseEntityType)
  entityType?: ShowcaseEntityType;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimValue)
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimValue)
  @IsString()
  niche?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimValue)
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimValue)
  @IsString()
  badge?: string;
}
