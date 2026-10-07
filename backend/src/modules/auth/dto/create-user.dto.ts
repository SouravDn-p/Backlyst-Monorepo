import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRoleEnum } from 'src/common/enum';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @ApiProperty({
    description: 'Name of the user',
    example: 'John Doe',
  })
  name!: string;

  @IsEmail()
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  email!: string;

  @IsString()
  @ApiProperty({
    description: 'Password for the user account',
    example: '12345678',
  })
  password!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Image key of the user',
    example: 'b1_9a2f1b8415412',
  })
  imageKey?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Referral code used by this user during registration',
    example: 'ARIF2026',
  })
  referralCode?: string;
}

export class CreateUserByAdminDto extends CreateUserDto {
  @ApiProperty({ enum: UserRoleEnum })
  @IsEnum(UserRoleEnum)
  role!: UserRoleEnum;
}
