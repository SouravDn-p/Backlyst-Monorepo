import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum TaskReviewActionDtoEnum {
  APPROVE = 'APPROVE',
  REQUEST_REVISION = 'REQUEST_REVISION',
  REJECT = 'REJECT',
}

export class ReviewTaskDto {
  @ApiProperty({
    enum: TaskReviewActionDtoEnum,
    enumName: 'TaskReviewAction',
    example: TaskReviewActionDtoEnum.APPROVE,
    description:
      'Requester review action for the selected provider submission.',
  })
  @IsEnum(TaskReviewActionDtoEnum)
  action!: TaskReviewActionDtoEnum;

  @ApiPropertyOptional({
    example: 'Please add the target anchor in the first half of the article.',
    description:
      'Optional requester note for approval, revision, or rejection.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  // ---- Spec §21: optional quality rubric dimensions (1-5) ----
  // When the requester supplies rubric dimensions on approval, a QualityRubric
  // row is persisted for auditability and the composite feeds the provider's
  // WebsiteMatchingProfile quality ratings. Missing dimensions fall back to the
  // legacy overall satisfaction derived from the approval action.
  @ApiPropertyOptional({
    description: 'Quality rubric: content relevance (1-5). Optional on review.',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  contentRelevance?: number;

  @ApiPropertyOptional({
    description: 'Quality rubric: technical quality (1-5). Optional on review.',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  technicalQuality?: number;

  @ApiPropertyOptional({
    description: 'Quality rubric: communication (1-5). Optional on review.',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communication?: number;

  @ApiPropertyOptional({
    description: 'Quality rubric: timeliness (1-5). Optional on review.',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  timeliness?: number;

  @ApiPropertyOptional({
    description: 'Optional quality rubric free-text comments.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}
