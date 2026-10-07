import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class AdminRevokeBadgeDto {
  @ApiPropertyOptional({ example: 'badge-id' })
  @IsOptional()
  @IsUUID()
  badgeId?: string;

  @ApiPropertyOptional({ example: 'FOUNDING_MEMBER' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  badgeCode?: string;

  @ApiPropertyOptional({ example: 'Assigned to wrong user' })
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiPropertyOptional({ example: { note: 'manual correction' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
