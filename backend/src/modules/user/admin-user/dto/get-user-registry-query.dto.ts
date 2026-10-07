import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanTier, ReferralStage, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetUserRegistryQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for user registry rows.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of rows per page. Maximum 100.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 'governance@cybertyne.com',
    description: 'Search by email address.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: PlanTier,
    example: PlanTier.GOLD,
    description: 'Filter users by active subscription tier.',
  })
  @IsOptional()
  @IsEnum(PlanTier)
  subscriptionTier?: PlanTier;

  @ApiPropertyOptional({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'Filter users by governance/account status.',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    enum: ReferralStage,
    example: ReferralStage.WEBSITE_VERIFIED,
    description:
      'Filter users by referral stage, matching either sent or received referrals.',
  })
  @IsOptional()
  @IsEnum(ReferralStage)
  referralStatus?: ReferralStage;
}
