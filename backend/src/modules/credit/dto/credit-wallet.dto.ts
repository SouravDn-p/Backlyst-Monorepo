import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class BuyPurchasedCreditsDto {
  @ApiProperty({
    example: 12,
    description:
      'How many purchased task credits the current user wants to buy.',
  })
  @IsInt()
  @IsIn([1, 5, 10])
  amount!: number;

  @ApiPropertyOptional({
    example: 'Buy task credits via Stripe checkout.',
    description: 'Optional note for internal audit trail.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class BuyVisibilityCreditsDto {
  @ApiProperty({
    example: 2,
    description:
      'How many visibility credits to buy into the user master wallet.',
  })
  @IsInt()
  @IsIn([1, 5, 10])
  amount!: number;

  @ApiPropertyOptional({
    example: 'Buy visibility boost for this website.',
    description: 'Optional note for internal audit trail.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AllocateVisibilityCreditsDto {
  @ApiProperty({
    example: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
    description:
      'Verified website that will receive allocated visibility credits.',
  })
  @IsUUID()
  websiteId!: string;

  @ApiProperty({
    example: 2,
    description:
      'How many visibility credits to allocate from the master wallet.',
  })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({
    example: 'Allocate visibility credits to this website.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AllocatePurchasedCreditsDto {
  @ApiProperty({
    example: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
    description:
      'Verified website that will receive allocated purchased credits.',
  })
  @IsUUID()
  websiteId!: string;

  @ApiProperty({
    example: 5,
    description:
      'How many purchased credits to allocate from the master wallet.',
  })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({
    example: 'Allocate purchased credits to the main requester website.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AllocateReferralCreditsDto {
  @ApiProperty({
    example: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
    description:
      'Verified website that will receive allocated referral credits.',
  })
  @IsUUID()
  websiteId!: string;

  @ApiProperty({
    example: 2,
    description:
      'How many referral credits to allocate from the master wallet.',
  })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({
    example: 'Allocate referral reward credits to this verified website.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AllocateSubscriptionCreditsDto {
  @ApiProperty({
    example: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
    description:
      'Verified website that will receive allocated subscription credits.',
  })
  @IsUUID()
  websiteId!: string;

  @ApiProperty({
    example: 5,
    description:
      'How many subscription credits to allocate from the master wallet.',
  })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({
    example: 'Allocate subscription credits to requester website.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
