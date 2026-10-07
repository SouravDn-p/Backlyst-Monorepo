import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateWebsiteDefaultsDto {
  @ApiPropertyOptional({
    example: false,
    description:
      'Send this field to enable or disable auto-accept. Because these are toggle pairs, sending this as true will turn taskManualReviewRequired off automatically.',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  taskAutoAcceptTasks?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      'Send this field to enable or disable manual review. Because these are toggle pairs, sending this as true will turn taskAutoAcceptTasks off automatically.',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  taskManualReviewRequired?: boolean;
}
