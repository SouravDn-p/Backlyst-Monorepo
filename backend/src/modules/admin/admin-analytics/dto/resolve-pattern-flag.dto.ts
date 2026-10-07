import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolvePatternFlagDto {
  @ApiPropertyOptional({
    example: 'Reviewed cluster; confirmed legitimate cross-promotion.',
    maxLength: 1000,
    description: 'Optional resolution note stored alongside the flag evidence.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
