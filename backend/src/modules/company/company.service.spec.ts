import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { CompanySortBy, GetCompaniesQueryDto, SortOrder } from './dto/get-companies-query.dto';
import { NotFoundException } from '@nestjs/common';

describe('CompanyService', () => {
  let service: CompanyService;
  let prismaService: any;
  let s3Service: any;

  const mockUsers = [
    {
      id: 'user-1',
      name: 'Alpha User',
      email: 'alpha@test.com',
      imageKey: 'avatars/alpha.jpg',
      country: 'United States',
      phoneNumber: '+11234567890',
      role: 'USER',
      isVerified: true,
      status: 'ACTIVE',
      companyName: 'Alpha Tech Corp',
      companyWebsite: 'https://alphatech.com',
      companyIndustry: 'Software & Technology',
      businessType: 'AGENCY',
      vatUid: 'VAT123',
      createdAt: new Date('2026-01-01'),
      publisher: {
        id: 'pub-1',
        nicheSpecialization: 'SaaS & B2B Software',
        bio: 'Alpha Tech Bio',
        tags: ['tech', 'software', 'saas'],
        isVerified: true,
      },
      badges: [
        {
          id: 'user-badge-1',
          status: 'ACTIVE',
          earnedAt: new Date('2026-02-01'),
          badge: {
            id: 'badge-1',
            code: 'TOP_PUBLISHER',
            name: 'Top Publisher',
            description: 'Top publisher badge',
            category: 'MARKETPLACE',
          },
        },
      ],
      websites: [
        {
          id: 'web-1',
          name: 'Alpha Blog',
          websiteUrl: 'https://alphablog.com',
          rootDomain: 'alphablog.com',
          domainRating: 70,
          verificationStatus: 'VERIFIED',
          country: 'United States',
          marketplaceCategories: [
            { role: 'PRIMARY', category: { id: 'cat-1', name: 'Technology', slug: 'technology' } },
          ],
          marketplaceTags: [
            { tag: { id: 'tag-1', name: 'SaaS', slug: 'saas' } },
          ],
          matchingProfile: {
            qualityScore: 95.0,
            completionRate: 0.98,
            reliabilityScore: 98,
            behaviourScore: 90,
            avgQualityRating: 4.9,
            completedInteractions: 50,
            successfulInteractions: 49,
            failedInteractions: 1,
          },
        },
      ],
      verifiedPlacements: [
        {
          id: 'vp-1',
          taskId: 'task-1',
          websiteId: 'web-1',
          finalTaskType: 'GUEST_POST',
          status: 'VERIFIED',
          verifiedAt: new Date('2026-05-01'),
          website: {
            id: 'web-1',
            name: 'Alpha Blog',
            websiteUrl: 'https://alphablog.com',
            domainRating: 70,
          },
          task: {
            id: 'task-1',
            projectTitle: 'SaaS Guest Post Article',
            targetUrl: 'https://client.com/saas-crm',
            anchorText: 'best saas crm tool',
            placementType: 'GUEST_POST',
            linkAttribute: 'DOFOLLOW',
            responsibilityType: 'PROVIDER_WRITES',
            providerProofDocuments: ['https://alphablog.com/saas-article'],
          },
        },
      ],
    },
    {
      id: 'user-2',
      name: 'Beta User',
      email: 'beta@test.com',
      imageKey: null,
      country: 'Canada',
      phoneNumber: '+10987654321',
      role: 'USER',
      isVerified: true,
      status: 'ACTIVE',
      companyName: 'Beta Media Inc',
      companyWebsite: 'https://betamedia.com',
      companyIndustry: 'Digital Marketing',
      businessType: 'INDIVIDUAL',
      vatUid: 'VAT456',
      createdAt: new Date('2026-03-01'),
      publisher: null,
      badges: [],
      websites: [
        {
          id: 'web-2',
          name: 'Beta Blog',
          websiteUrl: 'https://betablog.com',
          rootDomain: 'betablog.com',
          domainRating: 50,
          verificationStatus: 'VERIFIED',
          country: 'Canada',
          marketplaceCategories: [],
          marketplaceTags: [],
          matchingProfile: {
            qualityScore: 80.0,
            completionRate: 0.85,
            reliabilityScore: 85,
            behaviourScore: 80,
            avgQualityRating: 4.0,
            completedInteractions: 10,
            successfulInteractions: 9,
            failedInteractions: 1,
          },
        },
      ],
      verifiedPlacements: [],
    },
  ];

  beforeEach(async () => {
    prismaService = {
      user: {
        findMany: jest.fn().mockResolvedValue(mockUsers),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-1') {
            return Promise.resolve(mockUsers[0]);
          }
          return Promise.resolve(null);
        }),
      },
    };

    s3Service = {
      getDownloadUrl: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve({ downloadUrl: `https://s3.amazonaws.com/${key}` });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AwsS3Service, useValue: s3Service },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCompanies', () => {
    it('should return companies sorted by qualityScore DESC by default', async () => {
      const query: GetCompaniesQueryDto = {
        page: 1,
        limit: 10,
      };

      const result = await service.getCompanies(query);

      expect(result.success).toBe(true);
      expect(result.data.data.length).toBe(2);

      const firstCompany = result.data.data[0];
      const secondCompany = result.data.data[1];

      expect(firstCompany.id).toBe('user-1');
      expect(firstCompany.overallQualityScore).toBe(95.0);
      expect(firstCompany.avatarUrl).toBe('https://s3.amazonaws.com/avatars/alpha.jpg');

      expect(secondCompany.id).toBe('user-2');
      expect(secondCompany.overallQualityScore).toBe(80.0);
      expect(secondCompany.avatarUrl).toBeNull();
    });

    it('should filter companies by companyIndustry', async () => {
      const query: GetCompaniesQueryDto = {
        companyIndustry: 'Software & Technology',
      };

      await service.getCompanies(query);

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyIndustry: {
              contains: 'Software & Technology',
              mode: 'insensitive',
            },
          }),
        }),
      );
    });

    it('should filter companies by nicheSpecialization', async () => {
      const query: GetCompaniesQueryDto = {
        nicheSpecialization: 'SaaS & B2B Software',
      };

      await service.getCompanies(query);

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            publisher: {
              nicheSpecialization: {
                contains: 'SaaS & B2B Software',
                mode: 'insensitive',
              },
            },
          }),
        }),
      );
    });

    it('should filter companies by country', async () => {
      const query: GetCompaniesQueryDto = {
        country: 'United States',
      };

      await service.getCompanies(query);

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            country: {
              contains: 'United States',
              mode: 'insensitive',
            },
          }),
        }),
      );
    });

    it('should sort companies by averageRating ASC when specified', async () => {
      const query: GetCompaniesQueryDto = {
        sortBy: CompanySortBy.AVERAGE_RATING,
        order: SortOrder.ASC,
      };

      const result = await service.getCompanies(query);

      expect(result.data.data[0].id).toBe('user-2'); // Rating 4.0
      expect(result.data.data[1].id).toBe('user-1'); // Rating 4.9
    });
  });

  describe('getCompanyById', () => {
    it('should return complete company details including identity, badges, publisher, quality records, expanded verified samples, and website list', async () => {
      const result = await service.getCompanyById('user-1');

      expect(result.success).toBe(true);
      const company = result.data;

      // Identity & Attributes
      expect(company.id).toBe('user-1');
      expect(company.name).toBe('Alpha User');
      expect(company.email).toBe('alpha@test.com');
      expect(company.avatarUrl).toBe('https://s3.amazonaws.com/avatars/alpha.jpg');
      expect(company.companyName).toBe('Alpha Tech Corp');
      expect(company.companyIndustry).toBe('Software & Technology');
      expect(company.businessType).toBe('AGENCY');

      // Publisher Specialization
      expect(company.publisher.nicheSpecialization).toBe('SaaS & B2B Software');
      expect(company.publisher.isVerified).toBe(true);

      // User Badges
      expect(company.badges.length).toBe(1);
      expect(company.badges[0].code).toBe('TOP_PUBLISHER');

      // Quality Fulfillment Record
      expect(company.qualityFulfillment.overallQualityScore).toBe(95.0);
      expect(company.qualityFulfillment.completionRatePercentage).toBe(98);
      expect(company.qualityFulfillment.reliabilityScore).toBe(98);
      expect(company.qualityFulfillment.behaviourScore).toBe(90);

      // Expanded Verified Samples
      expect(company.verifiedSamples.length).toBe(1);
      const sample = company.verifiedSamples[0];
      expect(sample.taskId).toBe('task-1');
      expect(sample.projectTitle).toBe('SaaS Guest Post Article');
      expect(sample.targetUrl).toBe('https://client.com/saas-crm');
      expect(sample.anchorText).toBe('best saas crm tool');
      expect(sample.finalTaskType).toBe('GUEST_POST');
      expect(sample.linkAttribute).toBe('DOFOLLOW');
      expect(sample.responsibilityType).toBe('PROVIDER_WRITES');
      expect(sample.websiteName).toBe('Alpha Blog');
      expect(sample.websiteUrl).toBe('https://alphablog.com');
      expect(sample.proofDocuments).toContain('https://alphablog.com/saas-article');
      expect(sample.status).toBe('VERIFIED');

      // Website List & Links
      expect(company.websites.length).toBe(1);
      const website = company.websites[0];
      expect(website.id).toBe('web-1');
      expect(website.name).toBe('Alpha Blog');
      expect(website.websiteUrl).toBe('https://alphablog.com');
      expect(website.domainRating).toBe(70);
      expect(website.categories).toContain('Technology');
      expect(website.tags).toContain('SaaS');
    });

    it('should throw NotFoundException when company ID does not exist', async () => {
      await expect(service.getCompanyById('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
