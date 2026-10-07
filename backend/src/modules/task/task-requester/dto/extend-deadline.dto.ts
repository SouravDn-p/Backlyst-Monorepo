import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const DEADLINE_EXTENSION_DAYS_ENUM = [1, 3, 5, 7, 14] as const;

export class ExtendDeadlineDto {
  @ApiProperty({ enum: DEADLINE_EXTENSION_DAYS_ENUM, example: 3 })
  @IsIn(DEADLINE_EXTENSION_DAYS_ENUM)
  extendDays!: number;

  @ApiPropertyOptional({ example: 'Need more time for publisher response.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
