import { Test, TestingModule } from '@nestjs/testing';
import { ProviderTaskService } from './provider-task.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ValidationEngine } from '../market-algoritm/validation.engine';
import { MatchingEngine } from '../market-algoritm/matching.engine';
import { RecommendationService } from '../market-algoritm/recommendation.service';
import { DistributionEngine } from '../market-algoritm/distribution-engine.service';
import { RankingService } from '../market-algoritm/ranking.service';
import { MarketplaceConfigService } from '../market-algoritm/marketplace-config.service';
import { TierEngine } from '../market-algoritm/tier-engine.service';
import { TrustIndicatorService } from '../market-algoritm/trust-indicator.service';
import { CreditTaskService } from 'src/modules/credit/credit-task/credit-task.service';
import { TaskFlowService } from '../task-flow/task-flow.service';
import { TaskNotificationService } from 'src/modules/task-notification/task-notification.service';
import { AwsS3Service } from 'src/common/upload-file/aws-s3.service';
import { GraduatedPenaltyService } from '../market-algoritm/graduated-penalty.service';

describe('ProviderTaskService - Soft Ranking Opportunities', () => {
  let service: ProviderTaskService;
  let prisma: any;
  let validationEngine: any;
  let tierEngine: any;

  beforeEach(async () => {
    prisma = {
      website: { findMany: jest.fn().mockResolvedValue([{ id: 'web-1', rootDomain: 'provider.com', verificationStatus: 'VERIFIED' }]) },
      placementTask: { findMany: jest.fn().mockResolvedValue([]) },
    };
    validationEngine = {
      isUserActive: jest.fn().mockResolvedValue(true),
      getCooldownBlockedPairKeys: jest.fn().mockResolvedValue(new Set()),
    };
    tierEngine = {
      resolveTier: jest.fn().mockResolvedValue('LIMITED'),
      resolveDomainPool: jest.fn().mockReturnValue('LIMITED'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderTaskService,
        { provide: PrismaService, useValue: prisma },
        { provide: ValidationEngine, useValue: validationEngine },
        { provide: MatchingEngine, useValue: {} },
        { provide: RecommendationService, useValue: {} },
        { provide: DistributionEngine, useValue: {} },
        { provide: RankingService, useValue: {} },
        { provide: MarketplaceConfigService, useValue: { getMergedConfig: jest.fn().mockResolvedValue({}) } },
        { provide: TierEngine, useValue: tierEngine },
        { provide: TrustIndicatorService, useValue: { getIndicatorsBatch: jest.fn().mockResolvedValue(new Map()) } },
        { provide: CreditTaskService, useValue: {} },
        { provide: TaskFlowService, useValue: {} },
        { provide: TaskNotificationService, useValue: { sendTaskNotification: jest.fn().mockResolvedValue(null) } },
        { provide: AwsS3Service, useValue: {} },
        { provide: GraduatedPenaltyService, useValue: {} },
      ],
    }).compile();

    service = module.get<ProviderTaskService>(ProviderTaskService);
    (service as any).logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
    (service as any).mapTaskWithResolvedFiles = jest.fn().mockImplementation(async (t) => t);
  });

  describe('getProviderOpportunities', () => {
    it('1. Broad candidate retrieval fetches open tasks and enriches with matchingMetadata', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          requesterId: 'requester-1',
          requesterWebsiteId: 'web-1',
          createdAt: new Date(),
        },
      ];
      prisma.placementTask.findMany.mockResolvedValue(mockTasks);
      prisma.website.findMany.mockResolvedValue([{ id: 'web-1', rootDomain: 'example.com', domainRating: 30, verificationStatus: 'VERIFIED' }]);

      const result = await service.getProviderOpportunities('provider-1', { page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(1);
      expect(result.data!.items[0].matchingMetadata).toBeDefined();
      expect(result.data!.items[0].matchingMetadata.isVerifiedMatch).toBe(true);
      expect(result.data!.items[0].matchingMetadata.isTierCompatible).toBe(true);
      expect(result.data!.meta.totalItems).toBe(1);
    });

    it('2. Ranks candidates by fit score descending', async () => {
      const now = Date.now();
      const mockTasks = [
        {
          id: 'task-unverified',
          requesterId: 'req-1',
          requesterWebsiteId: 'web-unverified',
          createdAt: new Date(now - 10000),
        },
        {
          id: 'task-verified',
          requesterId: 'req-2',
          requesterWebsiteId: 'web-verified',
          createdAt: new Date(now),
        },
      ];
      prisma.placementTask.findMany.mockResolvedValue(mockTasks);
      prisma.website.findMany.mockResolvedValue([
        { id: 'web-unverified', rootDomain: 'siteA.com', domainRating: 30, verificationStatus: 'PENDING' },
        { id: 'web-verified', rootDomain: 'siteB.com', domainRating: 25, verificationStatus: 'VERIFIED' }
      ]);

      const result = await service.getProviderOpportunities('provider-1', { page: 1, limit: 10 });
      expect(result.data!.items.length).toBe(2);
      expect(result.data!.items[0].id).toBe('task-verified');
      expect(result.data!.items[1].id).toBe('task-unverified');
      expect(result.data!.items[0].matchingMetadata.fitScore).toBeGreaterThan(result.data!.items[1].matchingMetadata.fitScore);
    });

    it('3. Soft-flags tier upgrade requirements for high DR tasks without excluding them', async () => {
      const mockTasks = [
        {
          id: 'task-high-dr',
          requesterId: 'req-1',
          requesterWebsiteId: 'web-high-dr',
          createdAt: new Date(),
        },
      ];
      prisma.placementTask.findMany.mockResolvedValue(mockTasks);
      prisma.website.findMany.mockResolvedValue([
        { id: 'web-high-dr', rootDomain: 'highdr.com', domainRating: 85, verificationStatus: 'VERIFIED' }
      ]);
      tierEngine.resolveTier.mockResolvedValue('LIMITED'); // Limited tier max DR = 40

      const result = await service.getProviderOpportunities('provider-1', {});
      expect(result.data!.items.length).toBe(1);
      expect(result.data!.items[0].matchingMetadata.isTierCompatible).toBe(false);
      expect(result.data!.items[0].matchingMetadata.requiresUpgrade).toBe(true);
    });

    it('4. Excludes own tasks by default, includes them if includeOwnTasks is true', async () => {
      prisma.placementTask.findMany.mockResolvedValue([]);

      // Default behavior (includeOwnTasks is undefined/false)
      await service.getProviderOpportunities('provider-1', {});
      expect(prisma.placementTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requesterId: { not: 'provider-1' }
          })
        })
      );

      // includeOwnTasks is true
      await service.getProviderOpportunities('provider-1', { includeOwnTasks: true });
      const lastCallArgs = prisma.placementTask.findMany.mock.calls[prisma.placementTask.findMany.mock.calls.length - 1][0];
      expect(lastCallArgs.where.requesterId).toBeUndefined();
    });
  });
});
