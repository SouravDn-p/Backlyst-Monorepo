import {
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  IsUUID,
  ArrayUnique,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWebsiteDto {
  @ApiPropertyOptional({ example: 'My Startup' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'A platform for developers' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: 'Bangladesh' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Build faster with AI tools' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'b1_9a2f1b8415412' })
  logoKey?: string;

  @ApiPropertyOptional({
    description: 'Marketplace Category ID',
  })
  @IsOptional()
  @IsUUID('4')
  marketplaceCategoryId?: string;

  @ApiPropertyOptional({
    description: 'Marketplace Tag IDs',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  marketplaceTagIds?: string[];

  @ApiPropertyOptional({
    description: 'Secondary Marketplace Category IDs',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  secondaryMarketplaceCategoryIds?: string[];
}
