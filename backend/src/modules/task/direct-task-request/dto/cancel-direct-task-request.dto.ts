import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelDirectTaskRequestDto {
  @ApiPropertyOptional({
    example: 'Changed campaign target URL.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  cancellationReason?: string;
}
