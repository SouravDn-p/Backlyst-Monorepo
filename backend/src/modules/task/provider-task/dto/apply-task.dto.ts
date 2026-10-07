import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum ApplyTaskActionDtoEnum {
  APPLY = 'APPLY',
}

export class ApplyTaskDto {
  @ApiProperty({
    example: 'f27c7af8-4150-4e2c-a3f8-c04e7652af88',
    description: 'Provider website id used for this application.',
  })
  @IsUUID()
  providerWebsiteId!: string;

  @ApiPropertyOptional({
    example: 'I can deliver this placement within 48 hours.',
    description: 'Optional provider note while applying to a task.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
