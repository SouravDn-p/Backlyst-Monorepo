import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export enum CreditWalletTypeDtoEnum {
  SUBSCRIPTION = 'SUBSCRIPTION',
  PURCHASED = 'PURCHASED',
  REFERRAL = 'REFERRAL',
  EARNED = 'EARNED',
}

export class DeductTaskCreditDto {
  @ApiProperty({
    example: 'a16f47db-8ac8-4c9a-a58f-b2a01c0f2020',
    description: 'Task id for which requester website will spend credits.',
  })
  @IsUUID()
  taskId!: string;

  @ApiProperty({
    example: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
    description:
      'Requester website that is creating the task and spending credits.',
  })
  @IsUUID()
  requesterWebsiteId!: string;

  @ApiPropertyOptional({
    example: 'fb063d05-e534-4336-9ae6-0c570701ead0',
    description:
      'Requester user id. Optional compatibility field; task ownership is validated from taskId.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    example: 2,
    description: 'How many credits should be reserved/deducted for this task.',
  })
  @IsInt()
  @Min(1)
  creditAmount!: number;

  @ApiPropertyOptional({
    enum: CreditWalletTypeDtoEnum,
    example: CreditWalletTypeDtoEnum.SUBSCRIPTION,
    description: 'Optional wallet source hint for deduction.',
  })
  @IsOptional()
  @IsEnum(CreditWalletTypeDtoEnum)
  walletType?: CreditWalletTypeDtoEnum;

  @ApiPropertyOptional({
    example: 'Reserve 2 credits for guest post task creation.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RefundTaskCreditDto {
  @ApiProperty({
    example: 'a16f47db-8ac8-4c9a-a58f-b2a01c0f2020',
    description: 'Task id whose reserved credits should be refunded.',
  })
  @IsUUID()
  taskId!: string;

  @ApiProperty({
    example: '9d6b4a22-b6f9-4af5-9bda-6af09c22f111',
    description: 'Requester website that should receive the refund.',
  })
  @IsUUID()
  requesterWebsiteId!: string;

  @ApiPropertyOptional({
    example: 'fb063d05-e534-4336-9ae6-0c570701ead0',
    description:
      'Requester user id. Optional compatibility field; task ownership is validated from taskId.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    example: 2,
    description: 'How many credits should be refunded for this task.',
  })
  @IsInt()
  @Min(1)
  creditAmount!: number;

  @ApiPropertyOptional({
    enum: CreditWalletTypeDtoEnum,
    example: CreditWalletTypeDtoEnum.SUBSCRIPTION,
    description: 'Optional wallet source hint for refund.',
  })
  @IsOptional()
  @IsEnum(CreditWalletTypeDtoEnum)
  walletType?: CreditWalletTypeDtoEnum;

  @ApiPropertyOptional({
    example: 'Refund credits because the task was cancelled.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RewardProviderCreditDto {
  @ApiProperty({
    example: 'a16f47db-8ac8-4c9a-a58f-b2a01c0f2020',
    description: 'Task id that has been completed successfully.',
  })
  @IsUUID()
  taskId!: string;

  @ApiProperty({
    example: '44a0874c-0f3a-4c9a-8cd0-e9644c7567cf',
    description: 'Provider website that earned the reward.',
  })
  @IsUUID()
  providerWebsiteId!: string;

  @ApiPropertyOptional({
    example: '2e6bb640-f00d-4fb5-b6aa-5af1c255fa11',
    description:
      'Provider user id. Optional compatibility field; selected provider is validated from taskId.',
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiProperty({
    example: 2,
    description: 'How many earned credits the provider website should receive.',
  })
  @IsInt()
  @Min(1)
  creditAmount!: number;

  @ApiPropertyOptional({
    example: 'Reward provider website after approved task completion.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
