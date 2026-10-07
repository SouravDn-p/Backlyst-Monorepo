import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class QualityRubricDto {
  @ApiProperty({
    description: 'Content relevance score (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  contentRelevance: number;

  @ApiProperty({
    description: 'Technical quality score (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  technicalQuality: number;

  @ApiProperty({
    description: 'Communication score (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  communication: number;

  @ApiProperty({
    description: 'Timeliness score (1-5)',
    example: 3,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  timeliness: number;

  @ApiProperty({
    description: 'Overall satisfaction score (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  overallSatisfaction: number;

  @ApiPropertyOptional({ description: 'Optional comments about the quality' })
  @IsOptional()
  @IsString()
  comments?: string;
}

export function computeCompositeScore(rubric: {
  contentRelevance: number;
  technicalQuality: number;
  communication: number;
  timeliness: number;
  overallSatisfaction: number;
}): number {
  return Number(
    (
      rubric.contentRelevance * 0.25 +
      rubric.technicalQuality * 0.25 +
      rubric.communication * 0.2 +
      rubric.timeliness * 0.15 +
      rubric.overallSatisfaction * 0.15
    ).toFixed(2),
  );
}
