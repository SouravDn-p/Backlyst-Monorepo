import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreditWalletTypeDtoEnum } from 'src/modules/credit/credit-task/dto/task-credit.dto';

export enum DisputeDecisionDtoEnum {
  RESOLVE_IN_FAVOR_OF_REQUESTER = 'RESOLVE_IN_FAVOR_OF_REQUESTER',
  RESOLVE_IN_FAVOR_OF_PROVIDER = 'RESOLVE_IN_FAVOR_OF_PROVIDER',
  REJECT = 'REJECT',
  MARK_UNDER_REVIEW = 'MARK_UNDER_REVIEW',
}

export enum DisputeCreditAdjustmentTypeDtoEnum {
  REFUND_REQUESTER = 'REFUND_REQUESTER',
  REWARD_PROVIDER = 'REWARD_PROVIDER',
  NONE = 'NONE',
}

export class DisputeCreditAdjustmentDto {
  @ApiPropertyOptional({
    enum: DisputeCreditAdjustmentTypeDtoEnum,
    example: DisputeCreditAdjustmentTypeDtoEnum.REFUND_REQUESTER,
    description:
      'Credit action to apply when resolving. REFUND_REQUESTER returns credits to the requester website wallet; REWARD_PROVIDER grants earned credits to the provider website; NONE applies no credit change.',
  })
  @IsEnum(DisputeCreditAdjustmentTypeDtoEnum)
  type!: DisputeCreditAdjustmentTypeDtoEnum;

  @ApiPropertyOptional({
    example: 2,
    description:
      'Number of credits to adjust. Required when type is REFUND_REQUESTER or REWARD_PROVIDER.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({
    enum: CreditWalletTypeDtoEnum,
    example: CreditWalletTypeDtoEnum.SUBSCRIPTION,
    description:
      'Wallet source for the adjustment. Required when type is REFUND_REQUESTER or REWARD_PROVIDER.',
  })
  @IsOptional()
  @IsEnum(CreditWalletTypeDtoEnum)
  walletType?: CreditWalletTypeDtoEnum;

  @ApiPropertyOptional({
    example: 'Refund requester after disputed submission was rejected.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ResolveDisputeDto {
  @ApiPropertyOptional({
    enum: DisputeDecisionDtoEnum,
    example: DisputeDecisionDtoEnum.RESOLVE_IN_FAVOR_OF_REQUESTER,
    description:
      'Resolution decision. RESOLVE_IN_FAVOR_OF_REQUESTER / RESOLVE_IN_FAVOR_OF_PROVIDER finalise the dispute as RESOLVED; REJECT finalises as REJECTED; MARK_UNDER_REVIEW moves it to UNDER_REVIEW.',
  })
  @IsOptional()
  @IsEnum(DisputeDecisionDtoEnum)
  decision?: DisputeDecisionDtoEnum;

  @ApiPropertyOptional({
    type: DisputeCreditAdjustmentDto,
    description:
      'Optional credit adjustment applied atomically with the resolution.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DisputeCreditAdjustmentDto)
  creditAdjustment?: DisputeCreditAdjustmentDto;
}
