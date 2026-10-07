import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadProofDto {
  @ApiPropertyOptional({
    example: 'Uploaded proof for editorial placement.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
