import { Test, TestingModule } from '@nestjs/testing';
import { AdminTaxonomyService } from './admin-taxonomy.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AdminTaxonomyService', () => {
  let service: AdminTaxonomyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminTaxonomyService,
        {
          provide: PrismaService,
          useValue: {
            marketplaceCategory: {
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            marketplaceTag: {
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdminTaxonomyService>(AdminTaxonomyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
