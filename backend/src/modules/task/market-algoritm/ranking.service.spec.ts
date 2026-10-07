import { RankingService } from './ranking.service';
import { MatchCandidate } from './matching.types';

// Build a minimal provider WebsiteMatchingProfile for a given marketplace status.
function profile(over: any = {}) {
  return {
    visibilityScore: 50,
    opportunityScore: 50,
    reputationScore: 50,
    boostFactor: 2.5,
    riskScore: 0,
    lastRiskReason: null,
    lastRiskEventAt: null,
    isSuppressed: false,
    suppressedUntil: null,
    forceMatchNext: false,
    lastMatchedAt: null,
    exposureCount7d: 0,
    firstSuccessBoostActive: false,
    internalPriorityScore: 50,
    diversityScore: 50,
    forceNewDomainNext: false,
    forceNewDomainUntil: null,
    marketplaceStatus: 'ACTIVE',
    marketplaceStatusDailyCap: null,
    ...over,
  };
}

function candidate(status: string, over: any = {}): MatchCandidate {
  return {
    task: {
      id: 'task-1',
      requesterId: 'req-user',
      requesterWebsiteId: 'req-web',
      placementType: 'ANY',
      linkAttribute: 'ANY',
      matchingAttributes: { authority: 'MEETS' },
    },
    providerWebsite: {
      id: 'prov-web',
      authorId: 'prov-user',
      rootDomain: 'provider.com',
      websiteUrl: 'https://provider.com',
      industry: 'seo',
      country: null,
      language: null,
      domainRating: null,
      primaryCategoryKey: null,
      marketplaceTagKeys: [],
      matchingProfile: profile({ marketplaceStatus: status, ...over }),
    },
    requesterWebsite: {
      id: 'req-web',
      rootDomain: 'requester.com',
      websiteUrl: 'https://requester.com',
      industry: 'seo',
      country: null,
      language: null,
      primaryCategoryKey: null,
      marketplaceTagKeys: [],
    },
    compatibilityScore: 50,
    relaxationLevel: 0,
    matchingAttributes: { authority: 'MEETS' },
    reasons: [],
  } as any;
}

function makeRankingService(configOver: any = {}) {
  const prisma = {
    marketplaceScoringConfig: {
      findFirst: jest.fn().mockResolvedValue({
        compatibilityWeight: 0.35,
        opportunityWeight: 0.25,
        visibilityWeight: 0.15,
        reputationWeight: 0.15,
        behaviourWeight: 0,
        boostWeight: 0.1,
        forceMatchBonus: 1000,
        exposurePenaltyPerTaskView: 2,
        maxProviderMatchesPerDay: 3,
        maxRequesterExposurePerDay: 50,
        riskPenaltyRejectionWeight: 10,
        riskPenaltyDisputeWeight: 20,
        newWebsiteBoostFactor: 2.5,
        internalPriorityWeight: 0.1,
        diversityWeight: 0.05,
        qualityWeight: 0.05,
        lowPriorityFactor: 0.7,
        ...configOver,
      }),
    },
    placementTask: {
      findMany: jest.fn().mockResolvedValue([]), // no daily matches
    },
    opportunityImpression: {
      findMany: jest.fn().mockResolvedValue([]), // no requester exposure
    },
    websiteMatchingProfile: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const overrideService = {
    resolveForWebsite: jest.fn().mockResolvedValue({
      boostValue: null,
      visibilityScore: null,
      opportunityScore: null,
      reputationScore: null,
      forceMatchNext: false,
      suppressed: false,
    }),
  };

  const tierEngine = {
    resolveTierLimits: jest
      .fn()
      .mockResolvedValue({ weeklyInteractionLimit: 100, tierVelocityLimit: 1 }),
  };

  // Minimal MarketplaceConfigService mock returning ALL fields consumed by
  // rankAndFilter (see MergedMarketplaceConfig). test paths override via configOver.
  const configService = {
    getMergedConfig: jest.fn().mockResolvedValue({
      compatibilityWeight: 0.35,
      opportunityWeight: 0.25,
      visibilityWeight: 0.15,
      reputationWeight: 0.15,
      behaviourWeight: 0,
      boostWeight: 0.1,
      forceMatchBonus: 1000,
      exposurePenaltyPerTaskView: 2,
      maxProviderMatchesPerDay: 3,
      maxRequesterExposurePerDay: 50,
      riskPenaltyRejectionWeight: 10,
      riskPenaltyDisputeWeight: 20,
      newWebsiteBoostFactor: 2.5,
      internalPriorityWeight: 0.1,
      diversityWeight: 0.05,
      qualityWeight: 0.05,
      lowPriorityFactor: 1,
      ...configOver,
    }),
  };

  const riskEngine = {
    calculateEffectiveRisk: jest
      .fn()
      .mockImplementation((profile) => profile?.riskScore ?? 0),
  };

  return new RankingService(
    prisma as any,
    overrideService as any,
    tierEngine as any,
    configService as any,
    riskEngine as any,
  );
}

// Baseline weighted score for the default 50-everything profile (no boost, no
// penalties, tierPriority 1). Matches the formula in ranking.service.ts.
function baselineScore(config: any) {
  const weighted =
    50 * config.compatibilityWeight +
    50 * config.opportunityWeight +
    50 * config.visibilityWeight +
    50 * config.reputationWeight +
    // boostScore = (boostFactor 2.5 + newWebsiteBoost 0) * 20 = 50
    50 * config.boostWeight;
  const extras =
    50 * config.qualityWeight +
    50 * config.behaviourWeight +
    50 * config.internalPriorityWeight +
    50 * config.diversityWeight;
  return weighted + extras; // tierPriority 1, no penalties/bonuses
}

describe('RankingService — T6 marketplace status semantics (spec §7)', () => {
  const config = {
    compatibilityWeight: 0.35,
    opportunityWeight: 0.25,
    visibilityWeight: 0.15,
    reputationWeight: 0.15,
    behaviourWeight: 0,
    boostWeight: 0.1,
    internalPriorityWeight: 0.1,
    diversityWeight: 0.05,
    qualityWeight: 0.05,
    lowPriorityFactor: 0.7,
  };

  it('ACTIVE uses default boost (2.5) and no multiplier', async () => {
    const service = makeRankingService(config);
    const [ranked] = await service.rankAndFilter([candidate('ACTIVE')]);
    expect(ranked.score).toBeCloseTo(baselineScore(config), 2);
  });

  it('LOW_PRIORITY multiplies the final score by lowPriorityFactor (0.7)', async () => {
    const service = makeRankingService(config);
    const [ranked] = await service.rankAndFilter([candidate('LOW_PRIORITY')]);
    expect(ranked.score).toBeCloseTo(baselineScore(config) * 0.7, 2);
  });

  it('RESTRICTED disables boost (boostFactor treated as 1) -> lower score than ACTIVE', async () => {
    const service = makeRankingService(config);
    const [ranked] = await service.rankAndFilter([candidate('RESTRICTED')]);
    // boostScore for RESTRICTED = (1 + 0) * 20 = 20 vs ACTIVE 50 => -30 * 0.1
    expect(ranked.score).toBeCloseTo(baselineScore(config) - 3, 2);
    expect(ranked.score).toBeLessThan(baselineScore(config));
  });

  it('LIMITED_ACCESS with marketplaceStatusDailyCap=1 AND dailyMatches=1 is dropped', async () => {
    const service = makeRankingService(config);
    // dailyCounts comes from placementTask.findMany; provide one existing match.
    (service as any).prisma.placementTask.findMany = jest
      .fn()
      .mockResolvedValue([
        { assignedProviderWebsiteId: 'prov-web', assignedAt: new Date() },
      ]);
    const ranked = await service.rankAndFilter([
      candidate('LIMITED_ACCESS', { marketplaceStatusDailyCap: 1 }),
    ]);
    expect(ranked).toHaveLength(0);
  });

  it('UNDER_REVIEW remains browsable/ranked (not filtered at ranking stage)', async () => {
    const service = makeRankingService(config);
    const [ranked] = await service.rankAndFilter([candidate('UNDER_REVIEW')]);
    expect(ranked).toBeDefined();
    expect(ranked.score).toBeCloseTo(baselineScore(config), 2);
  });

  it('SUSPENDED is not special-cased at ranking (eligibility removes it upstream)', async () => {
    const service = makeRankingService(config);
    const [ranked] = await service.rankAndFilter([candidate('SUSPENDED')]);
    expect(ranked.score).toBeCloseTo(baselineScore(config), 2);
  });
});
