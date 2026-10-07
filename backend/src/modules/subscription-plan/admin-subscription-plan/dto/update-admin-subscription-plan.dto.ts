import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  Min,
} from 'class-validator';
import { CreateAdminSubscriptionPlanDto } from './create-admin-subscription-plan.dto';
import { BillingIntervalDtoEnum } from './create-admin-subscription-plan.dto';

export class UpdateAdminSubscriptionPlanDto extends PartialType(
  CreateAdminSubscriptionPlanDto,
) {
  @ApiPropertyOptional({
    example: '0',
    description: 'Base subscription price as a decimal string.',
  })
  @IsOptional()
  @IsNumberString()
  price?: string;

  @ApiPropertyOptional({
    enum: BillingIntervalDtoEnum,
    example: BillingIntervalDtoEnum.MONTHLY,
  })
  @IsOptional()
  @IsEnum(BillingIntervalDtoEnum)
  billingInterval?: BillingIntervalDtoEnum;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Task credits granted per billing cycle. Monthly plan = per month, yearly plan = per year.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  taskCreditsPerCycle?: number;

  @ApiPropertyOptional({
    example: 10,
    deprecated: true,
    description:
      'Deprecated alias kept for old clients. Use taskCreditsPerCycle instead.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyTaskCredits?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Maximum task credit capacity for this tier.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTaskCreditCapacity?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Maximum websites allowed for this tier.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxWebsites?: number;

  @ApiPropertyOptional({
    example: 2,
    description:
      'Maximum visibility credits allowed per website for this tier.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  visibilityCreditCapacity?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this plan is enabled for use.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
