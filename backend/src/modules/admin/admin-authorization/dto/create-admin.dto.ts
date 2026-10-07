import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { AdminPermissionItemDto } from './replace-admin-permissions.dto';

export class CreateAdminDto {
  @ApiProperty({ example: 'Operations Admin' })
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiProperty({ example: 'ops-admin@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @Length(6, 100)
  password!: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  @IsOptional()
  @IsString()
  @Length(2, 30)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Acme Inc.' })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  companyName?: string;

  @ApiPropertyOptional({ type: [AdminPermissionItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminPermissionItemDto)
  permissions?: AdminPermissionItemDto[];
}
