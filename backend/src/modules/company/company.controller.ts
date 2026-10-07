import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { GetCompaniesQueryDto } from './dto/get-companies-query.dto';

@ApiTags('Company')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all companies sorted by overall quality algorithm score',
    description:
      'Retrieves a paginated list of unified User/Company records sorted by overall Marketplace Algorithm Quality Score. Includes User name, Company attributes, User badges, derived average ratings & total review counts, Publisher Specialization, and overall fulfillment scores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated companies retrieved successfully.',
  })
  async getCompanies(@Query() query: GetCompaniesQueryDto) {
    return this.companyService.getCompanies(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get comprehensive company profile details by ID',
    description:
      'Retrieves detailed company profile information for a specified user/company ID including User identity, Company attributes, User badges, Publisher specialization, Quality Fulfillment record, placement formats offered, ratings, expanded verified placement samples, authority metrics, and website list with direct links.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Unique identifier of the user / company',
    example: 'c1f7b9c2-1234-4abc-9f12-abcdef123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Company details retrieved successfully.',
  })
  async getCompanyById(@Param('id') id: string) {
    return this.companyService.getCompanyById(id);
  }
}
