import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const DEADLINE_EXTENSION_RESPONSE_ACTIONS = [
  'APPROVE',
  'REJECT',
] as const;

export class RespondDeadlineExtensionDto {
  @ApiProperty({
    enum: DEADLINE_EXTENSION_RESPONSE_ACTIONS,
    example: 'APPROVE',
  })
  @IsIn(DEADLINE_EXTENSION_RESPONSE_ACTIONS)
  action!: (typeof DEADLINE_EXTENSION_RESPONSE_ACTIONS)[number];

  @ApiPropertyOptional({
    example: 'Approved. Please complete within the new deadline.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
