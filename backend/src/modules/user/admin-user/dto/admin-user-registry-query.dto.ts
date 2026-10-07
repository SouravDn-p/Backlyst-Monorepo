import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReferralStage, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PlanTierDtoEnum } from 'src/modules/subscription-plan/admin-subscription-plan/dto/create-admin-subscription-plan.dto';

export enum AdminUserRegistryReferralStatus {
  REFERRED = 'REFERRED',
  NOT_REFERRED = 'NOT_REFERRED',
  SIGNED_UP = 'SIGNED_UP',
  WEBSITE_VERIFIED = 'WEBSITE_VERIFIED',
  FIRST_BACKLINK_ACCEPTED = 'FIRST_BACKLINK_ACCEPTED',
  PAID_SUBSCRIPTION = 'PAID_SUBSCRIPTION',
}

export class AdminUserRegistryQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'governance@cybertyne.com',
    description: 'Search by email identity.',
  })
  @IsOptional()
  @IsString()
  searchByEmail?: string;

  @ApiPropertyOptional({
    example: 'governance@cybertyne.com',
    description: 'Alias for searchByEmail.',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    example: 'governance',
    description: 'Alias for searchByEmail.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: PlanTierDtoEnum,
    enumName: 'PlanTier',
    example: PlanTierDtoEnum.GOLD,
  })
  @IsOptional()
  @IsEnum(PlanTierDtoEnum)
  subscriptionTier?: PlanTierDtoEnum;

  @ApiPropertyOptional({
    enum: UserStatus,
    enumName: 'UserStatus',
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    enum: AdminUserRegistryReferralStatus,
    enumName: 'AdminUserRegistryReferralStatus',
    example: AdminUserRegistryReferralStatus.REFERRED,
  })
  @IsOptional()
  @IsEnum(AdminUserRegistryReferralStatus)
  referralStatus?: AdminUserRegistryReferralStatus | ReferralStage;
}
