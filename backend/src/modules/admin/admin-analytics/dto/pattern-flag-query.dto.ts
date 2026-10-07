import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PatternFlagStatus, PatternFlagType } from '@prisma/client';

export class PatternFlagQueryDto {
  @ApiPropertyOptional({
    enum: PatternFlagStatus,
    enumName: 'PatternFlagStatus',
    description: 'Filter by flag status (e.g. OPEN).',
  })
  @IsOptional()
  @IsEnum(PatternFlagStatus)
  status?: PatternFlagStatus;

  @ApiPropertyOptional({
    enum: PatternFlagType,
    enumName: 'PatternFlagType',
    description: 'Filter by flag type (e.g. CLUSTER_CONCENTRATION).',
  })
  @IsOptional()
  @IsEnum(PatternFlagType)
  type?: PatternFlagType;
}
