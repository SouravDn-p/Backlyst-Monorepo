import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminRegistryActionDto {
  @ApiPropertyOptional({
    example: 'Requested from institutional oversight panel.',
    description: 'Optional internal reason stored as a governance note.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
