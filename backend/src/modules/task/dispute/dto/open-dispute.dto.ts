import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class OpenDisputeDto {
  @ApiProperty({
    example:
      'The provider inserted a nofollow link instead of the agreed dofollow link.',
    description: 'Reason the dispute is being opened.',
  })
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Optional structured evidence (links, screenshots, notes) attached to the dispute. Stored as JSON.',
    type: 'object',
    additionalProperties: true,
    example: {
      expectedLinkAttribute: 'DOFOLLOW',
      actualLinkAttribute: 'NOFOLLOW',
      screenshotKeys: ['evidence/abc.png'],
    },
  })
  @IsOptional()
  @IsObject()
  evidence?: Record<string, unknown>;
}
