import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePublisherProfile {
  @ApiPropertyOptional({
    example: 'Nature & Environmental Stories',
    description: 'Primary topic niche of the publisher for content indexing',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  nicheSpecialization?: string;

  @ApiPropertyOptional({
    example:
      'Publish stories about nature, wildlife, environmental awareness, and sustainable living to educate and inspire readers.',
    description: 'Short SEO-friendly description of the publisher',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    example: [
      'nature',
      'wildlife',
      'environment',
      'sustainability',
      'climate change',
      'eco lifestyle',
    ],
    description:
      'SEO tags used for indexing and content categorization. Normalized automatically.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;

    const normalized = value
      .map((v) => v.trim().toLowerCase().replace(/\s+/g, ' '))
      .filter((v) => v.length > 0);

    return [...new Set(normalized)];
  })
  tags?: string[];
}
