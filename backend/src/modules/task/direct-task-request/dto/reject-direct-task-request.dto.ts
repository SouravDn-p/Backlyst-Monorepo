import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectDirectTaskRequestDto {
  @ApiPropertyOptional({
    example: 'Cannot fulfill guest post for this niche at the moment.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}
