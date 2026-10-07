import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from 'class-validator';

export enum PlatformFeatureToggleKeyDtoEnum {
  USER_REVIEWS_RATINGS = 'USER_REVIEWS_RATINGS',
  REFERRAL_ENGINE_INCENTIVES = 'REFERRAL_ENGINE_INCENTIVES',
  VISIBILITY_DISCOVERY_REWARDS = 'VISIBILITY_DISCOVERY_REWARDS',
  INTERNAL_ENTITY_MESSAGING = 'INTERNAL_ENTITY_MESSAGING',
  EXTERNAL_NODE_API_ACCESS = 'EXTERNAL_NODE_API_ACCESS',
  SELF_SERVICE_DISPUTE_CENTER = 'SELF_SERVICE_DISPUTE_CENTER',
}

export class PlatformFeatureToggleUpdateDto {
  @ApiProperty({
    enum: PlatformFeatureToggleKeyDtoEnum,
    example: PlatformFeatureToggleKeyDtoEnum.REFERRAL_ENGINE_INCENTIVES,
  })
  @IsEnum(PlatformFeatureToggleKeyDtoEnum)
  key!: PlatformFeatureToggleKeyDtoEnum;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  enabled!: boolean;
}

export class UpdatePlatformFeatureTogglesDto {
  @ApiProperty({
    type: [PlatformFeatureToggleUpdateDto],
    example: [
      {
        key: PlatformFeatureToggleKeyDtoEnum.USER_REVIEWS_RATINGS,
        enabled: true,
      },
      {
        key: PlatformFeatureToggleKeyDtoEnum.EXTERNAL_NODE_API_ACCESS,
        enabled: false,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PlatformFeatureToggleUpdateDto)
  toggles!: PlatformFeatureToggleUpdateDto[];
}
