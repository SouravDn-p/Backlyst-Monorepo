import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminAuthorizationSection } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AdminPermissionItemDto {
  @ApiProperty({ enum: AdminAuthorizationSection })
  @IsEnum(AdminAuthorizationSection)
  section!: AdminAuthorizationSection;

  @ApiProperty({ example: true })
  @IsBoolean()
  canCreate!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  canRead!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  canUpdate!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canDelete!: boolean;
}

export class ReplaceAdminPermissionsDto {
  @ApiProperty({ type: [AdminPermissionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdminPermissionItemDto)
  permissions!: AdminPermissionItemDto[];

  @ApiPropertyOptional({ example: 'Initial dashboard access assignment.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
