import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { GetCompaniesQueryDto } from './dto/get-companies-query.dto';

describe('CompanyController', () => {
  let controller: CompanyController;
  let service: CompanyService;

  const mockCompanyService = {
    getCompanies: jest.fn().mockResolvedValue({
      statusCode: 200,
      success: true,
      message: 'Companies fetched successfully',
      data: { data: [], meta: {} },
    }),
    getCompanyById: jest.fn().mockResolvedValue({
      statusCode: 200,
      success: true,
      message: 'Company details fetched successfully',
      data: { id: 'user-1', name: 'Alpha User' },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        { provide: CompanyService, useValue: mockCompanyService },
      ],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
    service = module.get<CompanyService>(CompanyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getCompanies query to CompanyService', async () => {
    const query: GetCompaniesQueryDto = { page: 1, limit: 10 };
    const response = await controller.getCompanies(query);

    expect(service.getCompanies).toHaveBeenCalledWith(query);
    expect(response.success).toBe(true);
  });

  it('should delegate getCompanyById to CompanyService', async () => {
    const response = await controller.getCompanyById('user-1');

    expect(service.getCompanyById).toHaveBeenCalledWith('user-1');
    expect(response.success).toBe(true);
  });
});
