import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum CountryEnum {
  USA = 'USA',
  CANADA = 'Canada',
  UNITED_KINGDOM = 'United Kingdom',
  ALBANIA = 'Albania',
  ANDORRA = 'Andorra',
  ARMENIA = 'Armenia',
  AUSTRIA = 'Austria',
  AZERBAIJAN = 'Azerbaijan',
  BELARUS = 'Belarus',
  BELGIUM = 'Belgium',
  BOSNIA_AND_HERZEGOVINA = 'Bosnia and Herzegovina',
  BULGARIA = 'Bulgaria',
  CROATIA = 'Croatia',
  CYPRUS = 'Cyprus',
  CZECH_REPUBLIC = 'Czech Republic',
  DENMARK = 'Denmark',
  ESTONIA = 'Estonia',
  FINLAND = 'Finland',
  FRANCE = 'France',
  GEORGIA = 'Georgia',
  GERMANY = 'Germany',
  GREECE = 'Greece',
  HUNGARY = 'Hungary',
  ICELAND = 'Iceland',
  IRELAND = 'Ireland',
  ITALY = 'Italy',
  KAZAKHSTAN = 'Kazakhstan',
  KOSOVO = 'Kosovo',
  LATVIA = 'Latvia',
  LIECHTENSTEIN = 'Liechtenstein',
  LITHUANIA = 'Lithuania',
  LUXEMBOURG = 'Luxembourg',
  MALTA = 'Malta',
  MOLDOVA = 'Moldova',
  MONACO = 'Monaco',
  MONTENEGRO = 'Montenegro',
  NETHERLANDS = 'Netherlands',
  NORTH_MACEDONIA = 'North Macedonia',
  NORWAY = 'Norway',
  POLAND = 'Poland',
  PORTUGAL = 'Portugal',
  ROMANIA = 'Romania',
  RUSSIA = 'Russia',
  SAN_MARINO = 'San Marino',
  SERBIA = 'Serbia',
  SLOVAKIA = 'Slovakia',
  SLOVENIA = 'Slovenia',
  SPAIN = 'Spain',
  SWEDEN = 'Sweden',
  SWITZERLAND = 'Switzerland',
  TURKEY = 'Turkey',
  UKRAINE = 'Ukraine',
  VATICAN_CITY = 'Vatican City'
}


export enum CompanySortBy {
  QUALITY_SCORE = 'qualityScore',
  AVERAGE_RATING = 'averageRating',
  PLATFORM_SUCCESS_RATE = 'platformSuccessRate',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetCompaniesQueryDto {
  @ApiPropertyOptional({
    description:
      'Search by user name, email, company name, company industry, company website, niche specialization, or tags',
    example: 'technology',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter companies by company industry (Deprecated: use industry)',
    example: 'Software & Technology',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  /**
   * @deprecated Use `industry` instead
   */
  companyIndustry?: string;

  @ApiPropertyOptional({
    description: 'Filter companies by industry or business type (supports multiple comma-separated)',
    example: 'Software,Agency',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : value))
  @IsString({ each: true })
  industry?: string[];

  @ApiPropertyOptional({
    description: 'Filter companies by publisher niche specialization',
    example: 'SaaS & B2B Software',
  })
  @IsOptional()
  @IsString()
  nicheSpecialization?: string;

  @ApiPropertyOptional({
    description: 'Filter companies by country (supports multiple comma-separated)',
    example: 'USA,Canada',
    enum: CountryEnum,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : value))
  @IsEnum(CountryEnum, { each: true })
  country?: CountryEnum[];

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Field to sort companies by',
    enum: CompanySortBy,
    default: CompanySortBy.QUALITY_SCORE,
  })
  @IsOptional()
  @IsEnum(CompanySortBy)
  sortBy?: CompanySortBy = CompanySortBy.QUALITY_SCORE;

  @ApiPropertyOptional({
    description: 'Sort direction order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}
