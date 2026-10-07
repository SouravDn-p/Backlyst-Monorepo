import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetProviderOpportunitiesQueryDto {
  @ApiPropertyOptional({
    description: 'Whether to include tasks created by the querying provider',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeOwnTasks?: boolean;
  @ApiPropertyOptional({ description: 'Specific website ID to query opportunities for' })
  @IsOptional()
  @IsString()
  providerWebsiteId?: string;

  @ApiPropertyOptional({ description: 'Filter by placement type', enum: ['BACKLINK_INSERTION', 'GUEST_POST', 'FLEXIBLE'] })
  @IsOptional()
  @IsString()
  placementType?: string;

  @ApiPropertyOptional({ description: 'Filter by link attribute', enum: ['DOFOLLOW', 'NOFOLLOW', 'UGC', 'SPONSORED'] })
  @IsOptional()
  @IsString()
  linkAttribute?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ['OPEN', 'WAITING_FOR_APPLICANTS'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter available tasks by requester website country',
    example: 'Bangladesh',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter available tasks by requester website industry',
    example: 'Marketing',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 50, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
