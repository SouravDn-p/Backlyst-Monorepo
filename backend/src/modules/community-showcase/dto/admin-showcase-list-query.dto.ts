import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShowcaseEntityType, ShowcaseSection } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AdminShowcaseListQueryDto {
  @ApiPropertyOptional({ enum: ShowcaseSection })
  @IsOptional()
  @IsEnum(ShowcaseSection)
  section?: ShowcaseSection;

  @ApiPropertyOptional({ enum: ShowcaseEntityType })
  @IsOptional()
  @IsEnum(ShowcaseEntityType)
  entityType?: ShowcaseEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimValue)
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
