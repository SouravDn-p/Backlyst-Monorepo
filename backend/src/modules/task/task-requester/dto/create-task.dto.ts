import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsArray,
  IsUUID,
  ArrayUnique,
} from 'class-validator';
import { CreditWalletTypeDtoEnum } from 'src/modules/credit/credit-task/dto/task-credit.dto';

export enum PlacementTypeDtoEnum {
  BACKLINK_INSERTION = 'BACKLINK_INSERTION',
  GUEST_POST = 'GUEST_POST',
  FLEXIBLE = 'FLEXIBLE',
}

export enum LinkAttributeDtoEnum {
  DOFOLLOW = 'DOFOLLOW',
  NOFOLLOW = 'NOFOLLOW',
  UGC = 'UGC',
  SPONSORED = 'SPONSORED',
}

export const REQUESTED_DEADLINE_DAYS_ENUM = [3, 5, 7, 10, 14, 21, 30] as const;
export type RequestedDeadlineDays =
  (typeof REQUESTED_DEADLINE_DAYS_ENUM)[number];

export class CreateTaskDto {
  @ApiProperty({ example: 'website-id' })
  @IsString()
  @IsNotEmpty()
  requesterWebsiteId!: string;

  @ApiProperty({ example: 'Guest post for fintech campaign' })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  projectTitle!: string;

  @ApiProperty({ example: 'https://example.com/target' })
  @IsUrl()
  targetUrl!: string;

  @ApiProperty({ example: 'best seo agency' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  anchorText!: string;

  @ApiPropertyOptional({
    example: 'Needs contextual placement in intro section.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  placementGuidelines?: string;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  requiredDomainRating?: number;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string;

  @ApiProperty({ enum: PlacementTypeDtoEnum })
  @IsEnum(PlacementTypeDtoEnum)
  placementType!: PlacementTypeDtoEnum;

  @ApiProperty({ enum: LinkAttributeDtoEnum })
  @IsEnum(LinkAttributeDtoEnum)
  linkAttribute!: LinkAttributeDtoEnum;

  @ApiProperty({ enum: REQUESTED_DEADLINE_DAYS_ENUM, example: 7 })
  @IsIn(REQUESTED_DEADLINE_DAYS_ENUM)
  requestedDeadlineDays!: number;

  @ApiProperty({
    enum: CreditWalletTypeDtoEnum,
    example: CreditWalletTypeDtoEnum.SUBSCRIPTION,
    description: 'Wallet source to deduct task credits from on task creation.',
  })
  @IsEnum(CreditWalletTypeDtoEnum)
  walletType!: CreditWalletTypeDtoEnum;

  @ApiPropertyOptional({
    description: 'Target Marketplace Category ID',
  })
  @IsOptional()
  @IsUUID('4')
  targetMarketplaceCategoryId?: string;

  @ApiPropertyOptional({
    description: 'Target Marketplace Tag IDs',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  marketplaceTagIds?: string[];

  @ApiPropertyOptional({
    description: 'Secondary Target Marketplace Category IDs',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  secondaryTargetMarketplaceCategoryIds?: string[];
}
