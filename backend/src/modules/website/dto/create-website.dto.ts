import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class CreateWebsiteDto {
  @ApiProperty({
    example: 'Example Website',
    description: 'Name of the website to be verified',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'https://example.com',
    description: 'Website URL to be verified',
  })
  @IsUrl()
  @IsNotEmpty()
  websiteUrl!: string;

  @ApiPropertyOptional({
    example: 'A leading tech blog offering insights.',
    description: 'Website description or bio',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'Your Tech Hub',
    description: 'Short website tagline',
  })
  @IsString()
  @IsOptional()
  tagline?: string;

  @ApiProperty({
    example: 'E-commerce',
    description: 'Industry type of the website',
  })
  @IsString()
  @IsNotEmpty()
  industry!: string;

  @ApiProperty({
    example: 'Bangladesh',
    description: 'Country where the website/business operates',
  })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiPropertyOptional({
    example: '6f89b408-83b1-41a4-b9df-5b4db65c91a1',
    description: 'Website primary category id',
    deprecated: true,
  })
  @IsUUID()
  @IsOptional()
  primaryCategoryId?: string;

  @ApiPropertyOptional({
    example: [
      '3e49aa20-cc3a-4f9c-bf7d-b13d29f6b0af',
      '8d704ad4-d8b6-411c-9954-b32d8de3125e',
    ],
    description: 'Website marketplace tag ids',
    deprecated: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  marketplaceTagKeys?: string[];

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
