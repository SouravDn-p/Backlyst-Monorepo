import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShowcaseEntityType, ShowcaseLinkType, ShowcaseSection } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateShowcaseEntryDto {
  @ApiProperty({ enum: ShowcaseSection })
  @IsEnum(ShowcaseSection)
  section!: ShowcaseSection;

  @ApiProperty({ enum: ShowcaseEntityType })
  @IsEnum(ShowcaseEntityType)
  entityType!: ShowcaseEntityType;

  @ApiProperty()
  @IsString()
  entityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  featuredFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  featuredUntil?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  showExternalLink?: boolean;

  @ApiPropertyOptional({ enum: ShowcaseLinkType })
  @IsOptional()
  @IsEnum(ShowcaseLinkType)
  linkType?: ShowcaseLinkType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
