import { ApiPropertyOptional } from '@nestjs/swagger';
import { WebsiteMarketplaceVisibilityStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum MarketplaceVisibilityComplianceFilter {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
}

export class AdminMarketplaceVisibilityQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: WebsiteMarketplaceVisibilityStatus,
    example: WebsiteMarketplaceVisibilityStatus.VISIBLE,
  })
  @IsOptional()
  @IsEnum(WebsiteMarketplaceVisibilityStatus)
  visibilityStatus?: WebsiteMarketplaceVisibilityStatus;

  @ApiPropertyOptional({
    enum: MarketplaceVisibilityComplianceFilter,
    example: MarketplaceVisibilityComplianceFilter.COMPLIANT,
  })
  @IsOptional()
  @IsEnum(MarketplaceVisibilityComplianceFilter)
  compliance?: MarketplaceVisibilityComplianceFilter;

  @ApiPropertyOptional({
    example: 'techcrunch',
    description: 'Search by website name, URL, owner name, or owner email.',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
