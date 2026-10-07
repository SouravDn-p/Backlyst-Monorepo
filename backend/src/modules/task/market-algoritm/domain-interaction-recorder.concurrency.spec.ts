import { Test, TestingModule } from '@nestjs/testing';
import { DomainInteractionRecorderService } from './domain-interaction-recorder.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ValidationEngine } from './validation.engine';

describe('DomainInteractionRecorderService Concurrency (MC-002, MC-005)', () => {
  let service: DomainInteractionRecorderService;
  let prisma: PrismaService;
  let validationEngine: ValidationEngine;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    
    const tierEngine = {
      getLimitsForWebsite: jest.fn().mockResolvedValue({ tierVelocityLimit: 10, weeklyInteractionLimit: 100 }),
      isTierAllowed: jest.fn().mockResolvedValue(true),
      resolveTierLimits: jest.fn().mockResolvedValue({ tierVelocityLimit: 10, weeklyInteractionLimit: 100 }),
      countDomainWeeklyInteractions: jest.fn().mockResolvedValue(0),
    };
    const distributionEngine = {
      isTargetEligible: jest.fn().mockResolvedValue(true),
      isNetworkConcentrationAllowed: jest.fn().mockResolvedValue(true),
      getNicheConcentrationLevel: jest.fn().mockResolvedValue('LOW'),
    };
    const configService = {
      getMarketplaceConfig: jest.fn().mockResolvedValue({ tierVelocityLimit: 10, weeklyInteractionLimit: 100, maxNetworkConcentrationRatio: 0.2, minNetworkEntitiesForConcentration: 10 }),
      getMergedConfig: jest.fn().mockResolvedValue({
        repeatPairCooldownDays: 30,
        reciprocalCooldownDays: 14,
        maxNetworkConcentrationPerWindow: 5,
        networkConcentrationWindowDays: 7
      }),
    };
    const rootDomainNormalizer = {
      normalizeRootDomainSync: (d: string) => d.toLowerCase().trim(),
    };
    const riskEngine = {
      isSuspicious: jest.fn().mockResolvedValue(false),
      calculateEffectiveRisk: jest.fn().mockReturnValue(0),
    };
    const overrideService = {
      resolveForWebsite: jest.fn().mockResolvedValue({ forceMatchNext: false, suppressed: false }),
    };
    const patternMonitorService = {
      hasActivePatternFlag: jest.fn().mockResolvedValue(false),
    };

    validationEngine = new ValidationEngine(
      prisma,
      tierEngine as any,
      distributionEngine as any,
      configService as any,
      rootDomainNormalizer as any,
      riskEngine as any,
      overrideService as any,
      patternMonitorService as any,
    );

    service = new DomainInteractionRecorderService(validationEngine);
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  async function createFixture(index: number, type: 'requester' | 'provider', user: any) {
    const domain = `${type}-${Date.now()}-${index}.com`;
    const website = await prisma.website.create({
      data: {
        websiteUrl: `https://${domain}`,
        rootDomain: domain,
        name: `${type} Test`,
        authorId: user.id,
        industry: 'TEST',
        country: 'US',
        verificationStatus: 'VERIFIED',
        marketplaceVisibilityStatus: 'VISIBLE',
        isFlag: false,
        isWalletLock: false,
        matchingProfile: {
          create: {
            marketplaceStatus: 'ACTIVE',
            riskScore: 0,
            isSuppressed: false,
            userId: user.id,
          }
        }
      },
    });
    return website;
  }

  it('baseline: one clean sequential request succeeds', async () => {
    const user = await prisma.user.create({
      data: { email: `baseline-${Date.now()}@example.com`, name: 'Test', status: 'ACTIVE' }
    });
    const provider = await createFixture(0, 'provider', user);
    const requester = await createFixture(0, 'requester', user);

    let successCount = 0;
    try {
      await prisma.$transaction(async (tx) => {
        await service.validateAndRecord(tx, {
          taskId: `task-base-${Date.now()}`,
          requesterWebsiteId: requester.id,
          providerWebsiteId: provider.id,
          completedAt: new Date(),
        }, {
          stage: 'APPROVE',
          actorUserId: user.id,
          providerDomain: provider.rootDomain!,
          requesterDomain: requester.rootDomain!,
          dailyMatches: 0,
          maxProviderMatchesPerDay: 1,
        });
        
        await (tx as any).placementTask.create({
          data: {
            id: `task-base-${Date.now()}`,
            lifecycleStatus: 'COMPLETED',
            requesterId: user.id,
            requesterWebsiteId: requester.id,
            assignedProviderWebsiteId: provider.id,
            projectTitle: 'baseline', targetUrl: 'https://test.com', anchorText: 'test',
            placementType: 'BACKLINK_INSERTION', linkAttribute: 'DOFOLLOW', requestedDeadlineDays: 1,
            assignedAt: new Date(),
            creditCost: 1,
            reservedCreditAmount: 1,
            walletType: 'PURCHASED',
          }
        });
      });
      successCount++;
    } catch (e) {
      console.error(e);
    }
    expect(successCount).toBe(1);
  });

  it('should only allow 1 out of 10 concurrent validateAndRecord calls when daily limit is 1', async () => {
    const user = await prisma.user.create({
      data: { email: `test-${Date.now()}@example.com`, name: 'Test', status: 'ACTIVE' }
    });
    const provider = await createFixture(100, 'provider', user);

    let successCount = 0;
    let failCount = 0;

    const runRequest = async (index: number) => {
      const requester = await createFixture(index, 'requester', user);
      
      try {
        await prisma.$transaction(async (tx) => {
          await service.validateAndRecord(tx, {
            taskId: `task-conc-${Date.now()}-${index}`,
            requesterWebsiteId: requester.id,
            providerWebsiteId: provider.id,
            completedAt: new Date(),
          }, {
            stage: 'APPROVE',
            actorUserId: user.id,
            providerDomain: provider.rootDomain!,
            requesterDomain: requester.rootDomain!,
            dailyMatches: 0, // Should be overridden by internal recalculation under lock
            maxProviderMatchesPerDay: 1,
          });
          
          await (tx as any).placementTask.create({
            data: {
              id: `task-conc-${Date.now()}-${index}`,
              lifecycleStatus: 'COMPLETED',
              requesterId: user.id,
              requesterWebsiteId: requester.id,
              assignedProviderWebsiteId: provider.id,
              projectTitle: 'conc', targetUrl: 'https://test.com', anchorText: 'test',
              placementType: 'BACKLINK_INSERTION', linkAttribute: 'DOFOLLOW', requestedDeadlineDays: 1,
              assignedAt: new Date(),
              creditCost: 1,
              reservedCreditAmount: 1,
              walletType: 'PURCHASED',
            }
          });
        });
        successCount++;
      } catch (e: any) {
        // e.g. ForbiddenException: "Limit reached"
        failCount++;
      }
    };

    const promises = Array.from({ length: 10 }).map((_, i) => runRequest(i));
    await Promise.allSettled(promises);

    expect(successCount).toBe(1);
    expect(failCount).toBe(9);
  });
});
