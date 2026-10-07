import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum AdminTaskActionDtoEnum {
  FREEZE = 'FREEZE',
  FORCE_APPROVE = 'FORCE_APPROVE',
  FORCE_REJECT = 'FORCE_REJECT',
  CREDIT_REFUND = 'CREDIT_REFUND',
  CREDIT_REVERSE = 'CREDIT_REVERSE',
  RESOLVE_DISPUTE = 'RESOLVE_DISPUTE',
  FLAG_ABUSE_PATTERN = 'FLAG_ABUSE_PATTERN',
}

export enum AdminDisputeResolutionDtoEnum {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_REVISION = 'REQUEST_REVISION',
}

export class AdminTaskActionDto {
  @ApiProperty({
    enum: AdminTaskActionDtoEnum,
    enumName: 'AdminTaskAction',
    example: AdminTaskActionDtoEnum.FREEZE,
    description:
      'Admin action to apply to the task. Frontend should render this as an enum selector.',
  })
  @IsEnum(AdminTaskActionDtoEnum)
  action!: AdminTaskActionDtoEnum;

  @ApiProperty({
    example:
      'Fraud review pending. Freezing task and flagging for admin follow-up.',
    description: 'Required audit reason for every admin action.',
  })
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Required for credit refund actions. Optional for full reverse.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({
    enum: AdminDisputeResolutionDtoEnum,
    enumName: 'AdminDisputeResolution',
    example: AdminDisputeResolutionDtoEnum.APPROVE,
    description:
      'Required when action is RESOLVE_DISPUTE. Determines the final dispute outcome.',
  })
  @IsOptional()
  @IsEnum(AdminDisputeResolutionDtoEnum)
  disputeResolution?: AdminDisputeResolutionDtoEnum;
}
