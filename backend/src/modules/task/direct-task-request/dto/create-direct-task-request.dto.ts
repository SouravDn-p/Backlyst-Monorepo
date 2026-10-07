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
} from 'class-validator';
import { CreditWalletTypeDtoEnum } from 'src/modules/credit/credit-task/dto/task-credit.dto';
import {
  LinkAttributeDtoEnum,
  PlacementTypeDtoEnum,
  REQUESTED_DEADLINE_DAYS_ENUM,
} from '../../task-requester/dto/create-task.dto';

export class CreateDirectTaskRequestDto {
  @ApiProperty({ example: 'requester-website-id' })
  @IsString()
  @IsNotEmpty()
  requesterWebsiteId!: string;

  @ApiProperty({ example: 'target-provider-id' })
  @IsString()
  @IsNotEmpty()
  targetProviderId!: string;

  @ApiProperty({ example: 'Direct Guest post for fintech campaign' })
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
    description: 'Wallet source to deduct task credits from on direct request creation.',
  })
  @IsEnum(CreditWalletTypeDtoEnum)
  walletType!: CreditWalletTypeDtoEnum;
}
