import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

export enum NicheCapScope {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
}

export class CreateNicheCapDto {
  @ApiProperty({
    description: 'MarketplaceCategory id (primary or secondary niche).',
    example: 'a16f47db-8ac8-4c9a-a58f-b2a01c0f2020',
  })
  @IsUUID()
  @IsNotEmpty()
  categoryKey!: string;

  @ApiPropertyOptional({
    enum: NicheCapScope,
    default: NicheCapScope.PRIMARY,
    description: 'PRIMARY | SECONDARY',
  })
  @IsOptional()
  @IsEnum(NicheCapScope)
  scope?: NicheCapScope;

  @ApiProperty({
    description: 'Max interactions allowed within the rolling window.',
    example: 20,
  })
  @IsInt()
  @Min(1)
  maxPerWindow!: number;

  @ApiPropertyOptional({
    description: 'Rolling window length in days.',
    example: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  windowDays?: number;

  @ApiPropertyOptional({
    description: 'Optional admin note describing the cap.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateNicheCapDto {
  @ApiPropertyOptional({
    description: 'Max interactions allowed within the rolling window.',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerWindow?: number;

  @ApiPropertyOptional({
    description: 'Rolling window length in days.',
    example: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  windowDays?: number;

  @ApiPropertyOptional({
    description: 'Whether the cap is active (soft delete sets this false).',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Optional admin note describing the cap.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ListNicheCapQueryDto {
  @ApiPropertyOptional({
    enum: NicheCapScope,
    description: 'Filter by scope (PRIMARY | SECONDARY).',
  })
  @IsOptional()
  @IsEnum(NicheCapScope)
  scope?: NicheCapScope;

  @ApiPropertyOptional({
    description: 'Filter by active state.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
