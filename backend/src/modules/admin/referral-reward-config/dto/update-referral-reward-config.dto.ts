import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateReferralRewardConfigDto {
  @ApiPropertyOptional({
    example: 150,
    description: 'Task credits rewarded per completed referral.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  rewardPerReferralCredits?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Maximum referral reward credits one user can earn.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxUserReferralPool?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Prevent rewarding the same referred user more than once.',
  })
  @IsOptional()
  @IsBoolean()
  oneCreditPerUserEnforced?: boolean;
}
