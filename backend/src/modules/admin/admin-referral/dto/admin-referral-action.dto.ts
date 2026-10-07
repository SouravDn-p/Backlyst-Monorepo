import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum DisableReferralTarget {
  REFERRER = 'REFERRER',
  REFERRED = 'REFERRED',
}

export class AdminReferralActionDto {
  @ApiProperty({
    example: 'Manual review completed by compliance admin.',
  })
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({
    example: 'referral-action-REF-002-001',
    description:
      'Optional idempotency key. Use one for approve/revoke actions to prevent duplicate settlement.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}

export class ApproveReferralCreditDto extends AdminReferralActionDto {
  @ApiPropertyOptional({
    example: 450,
    description:
      'Optional credit amount to issue if this referral has no reward row yet.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  creditAmount?: number;
}

export class DisableEntityReferralsDto extends AdminReferralActionDto {
  @ApiProperty({
    enum: DisableReferralTarget,
    example: DisableReferralTarget.REFERRER,
  })
  @IsEnum(DisableReferralTarget)
  target!: DisableReferralTarget;
}
