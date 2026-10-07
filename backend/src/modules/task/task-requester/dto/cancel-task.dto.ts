import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelTaskDto {
  @ApiPropertyOptional({
    example: 'Campaign requirements changed.',
    description: 'Optional requester cancellation reason.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
