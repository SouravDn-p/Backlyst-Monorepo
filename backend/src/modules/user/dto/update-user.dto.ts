import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { UserBusinessTypeEnum } from 'src/common/enum';

const emptyStringToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @Length(2, 30)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Bangladesh' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @Length(2, 100)
  country?: string;

  @ApiPropertyOptional({ example: 'Acme Inc.' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @Length(2, 150)
  companyName?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  companyWebsite?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  companyIndustry?: string;

  @ApiPropertyOptional({
    enum: UserBusinessTypeEnum,
    example: UserBusinessTypeEnum.SOLE_PROPRIETORSHIP,
  })
  @IsOptional()
  @IsEnum(UserBusinessTypeEnum)
  businessType?: UserBusinessTypeEnum;

  @ApiPropertyOptional({ example: 'VAT-123456789' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @Length(2, 50)
  vatUid?: string;

  @ApiPropertyOptional({
    example: 'NewSecurePassword123!',
    description: 'Optional password to set or replace during profile update',
  })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @Length(6, 100)
  newPassword?: string;

  @ApiPropertyOptional({
    example: 'user/1719980000000-avatar.png',
    description: 'S3 object key returned by the presigned upload flow.',
  })
  @IsOptional()
  @IsString()
  imageKey?: string;
}
