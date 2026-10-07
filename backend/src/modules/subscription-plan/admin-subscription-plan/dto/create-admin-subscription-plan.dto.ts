import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum PlanTierDtoEnum {
  FREE = 'FREE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  ENTERPRISE = 'ENTERPRISE',
}

export enum BillingIntervalDtoEnum {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum SubscriptionPlanVisibilityDtoEnum {
  MODARATE = 'MODARATE',
  HIGHER = 'HIGHER',
  MAXIMUM = 'MAXIMUM',
}

export class SubscriptionPlanFeatureDto {
  @ApiProperty({
    example: 'credit',
    description: 'Feature key.',
  })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({
    example: '10 Credits Per Month',
    description: 'Feature value.',
  })
  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class CreateAdminSubscriptionPlanDto {
  @ApiProperty({
    type: 'string',
    enum: PlanTierDtoEnum,
    enumName: 'PlanTier',
    example: PlanTierDtoEnum.GOLD,
    description: 'Subscription plan tier.',
  })
  @IsEnum(PlanTierDtoEnum)
  tier!: PlanTierDtoEnum;

  @ApiProperty({
    example: 'Gold',
    description: 'Subscription plan name.',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: 'Best for growing businesses.',
    description: 'Optional plan description.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: 'string',
    example: '79.99',
    description: 'Plan price as a decimal string.',
  })
  @IsNumberString()
  @IsNotEmpty()
  price!: string;

  @ApiProperty({
    type: 'number',
    example: 5,
    description:
      'Legacy compatibility field. Use taskCreditsPerCycle for subscription credit grants.',
  })
  @IsOptional()
  @IsNumber()
  credit?: number;

  @ApiProperty({
    type: 'number',
    example: 10,
    description:
      'Task credits granted per billing cycle. Monthly plan = per month, yearly plan = per year.',
  })
  @IsOptional()
  @IsNumber()
  taskCreditsPerCycle?: number;

  @ApiProperty({
    type: 'string',
    enum: SubscriptionPlanVisibilityDtoEnum,
    enumName: 'SubscriptionPlanVisibility',
    example: SubscriptionPlanVisibilityDtoEnum.MODARATE,
    description: 'Subscription plan visibility.',
  })
  @IsEnum(SubscriptionPlanVisibilityDtoEnum)
  visibility!: SubscriptionPlanVisibilityDtoEnum;

  @ApiProperty({
    type: 'string',
    enum: BillingIntervalDtoEnum,
    enumName: 'BillingInterval',
    example: BillingIntervalDtoEnum.MONTHLY,
    description: 'Billing interval for the subscription plan.',
  })
  @IsEnum(BillingIntervalDtoEnum)
  billingInterval!: BillingIntervalDtoEnum;

  @ApiProperty({
    type: [SubscriptionPlanFeatureDto],
    example: [
      { key: 'extra_1', value: 'extra_feature_1' },
      { key: 'extra_2', value: 'extra_feature_2' },
      { key: 'extra_3', value: 'extra_feature_3' },
      { key: 'extra_4', value: 'extra_feature_4' },
      { key: 'extra_5', value: 'extra_feature_5' },
    ],
    description: 'Plan features stored as JSON array.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubscriptionPlanFeatureDto)
  features!: SubscriptionPlanFeatureDto[];
}
