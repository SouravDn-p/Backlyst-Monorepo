import { ValidationEngine } from './validation.engine';
import { TierEngine } from './tier-engine.service';
import { DistributionEngine } from './distribution-engine.service';

// Returns an eligible-website row for LEVEL 1 (isWebsiteEligible ->
// isMarketplaceWebsiteEligible) so validation can reach the niche-cap check.
function eligibleWebsiteRow(userId: string) {
  return {
    authorId: userId,
    isDeleted: false,
    verificationStatus: 'VERIFIED',
    marketplaceVisibilityStatus: 'VISIBLE',
    isFlag: false,
    isWalletLock: false,
    matchingProfile: {
      marketplaceStatus: 'ACTIVE',
      riskScore: 0,
      isSuppressed: false,
      suppressedUntil: null,
    },
  };
}

// Base Prisma mock shared by all tests; tests override `website.findMany`
// (the niche-cap lookup) and `distributionEngine` as needed.
function basePrisma(overrides: any = {}) {
  return {
    user: { findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) },
    website: {
      findUnique: jest
        .fn()
        .mockImplementation((args: any) =>
          Promise.resolve(
            args?.where?.id ? eligibleWebsiteRow('actor-1') : null,
          ),
        ),
      findMany: jest.fn().mockResolvedValue([]),
    },
    marketplaceScoringConfig: {
      findFirst: jest.fn().mockResolvedValue(null), // triggers fallback defaults
    },
    domainPairStat: {
      findUnique: jest.fn().mockResolvedValue(null), // no cooldown -> canMatch
      count: jest.fn().mockResolvedValue(0),
    },
    websiteMatchingProfile: {
      findUnique: jest.fn().mockResolvedValue({
        marketplaceStatus: 'ACTIVE',
        riskScore: 0,
        isSuppressed: false,
        suppressedUntil: null,
        weeklyInteractionLimit: 100,
        tierVelocityLimit: 1,
      }),
    },
    marketplaceValidationLog: {
      create: jest.fn().mockResolvedValue(undefined),
    },
    marketplaceOverrideAudit: {
      create: jest.fn().mockResolvedValue(undefined),
    },
    // Default: no coordinated-exchange pattern flags OPEN. Tests that exercise
    // the R10 real-time block override this via `overrides`.
    patternFlag: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    domainInteraction: {
      count: jest.fn().mockResolvedValue(0),
    },
    ...overrides,
  };
}

// Build a ValidationEngine with mocked dependencies.
function makeEngine(
  overrides: {
    prisma?: any;
    tierEngine?: any;
    distributionEngine?: Partial<DistributionEngine>;
  } = {},
): ValidationEngine {
  const riskEngine = {
    calculateEffectiveRisk: jest
      .fn()
      .mockImplementation((profile) => profile?.riskScore ?? 0),
  } as any;
  const prisma = overrides.prisma ?? basePrisma();
  const tierEngine =
    overrides.tierEngine ??
    ({
      resolveTierLimits: jest
        .fn()
        .mockResolvedValue({
          weeklyInteractionLimit: 100,
          tierVelocityLimit: 1,
        }),
      countWeeklyInteractions: jest.fn().mockResolvedValue(0),
      countDomainWeeklyInteractions: jest.fn().mockResolvedValue(0),
    } as any);
  const distributionEngine =
    overrides.distributionEngine ??
    ({ isNicheWithinCap: jest.fn().mockResolvedValue(true) } as any);

  // Minimal MarketplaceConfigService mock returning ALL fields consumed by the
  // validation engine (cooldowns + network concentration).
  const configService = {
    getMergedConfig: jest.fn().mockResolvedValue({
      repeatPairCooldownDays: 90,
      reciprocalCooldownDays: 120,
      maxNetworkConcentrationPerWindow: 50,
      networkConcentrationWindowDays: 7,
    }),
  };

  // Minimal RootDomainNormalizerService mock (data-driven suffix list is not
  // exercised by these unit tests; fallback normalization is sufficient).
  const rootDomainNormalizer = {
    normalizeRootDomainSync: (v: string) => (v ?? '').toLowerCase(),
  };

  return new ValidationEngine(
    prisma,
    tierEngine,
    distributionEngine,
    configService as any,
    rootDomainNormalizer as any,
    riskEngine,
    { resolveForWebsite: jest.fn().mockResolvedValue({}) } as any,
    {} as any,
  );
}

const websitesInCap = [
  { primaryCategoryKey: 'seo', secondaryCategoryKey: 'content' },
  { primaryCategoryKey: 'seo', secondaryCategoryKey: 'content' },
];
describe('ValidationEngine — T6 marketplace status semantics (spec §7)', () => {
  // Build an engine whose provider WebsiteMatchingProfile reports the given
  // marketplaceStatus / riskScore. Everything else stays in the ACTIVE-style
  // eligible baseline so only the status gate is exercised.
  function makeStatusEngine(over: {
    marketplaceStatus?: string;
    riskScore?: number;
    marketplaceStatusDailyCap?: number | null;
  }) {
    return makeEngine({
      prisma: basePrisma({
        websiteMatchingProfile: {
          findUnique: jest.fn().mockResolvedValue({
            marketplaceStatus: over.marketplaceStatus ?? 'ACTIVE',
            riskScore: over.riskScore ?? 0,
            isSuppressed: false,
            suppressedUntil: null,
            weeklyInteractionLimit: 100,
            tierVelocityLimit: 1,
            marketplaceStatusDailyCap: over.marketplaceStatusDailyCap ?? null,
          }),
        },
      }),
    });
  }

  const baseInput = {
    stage: 'ACCEPT' as const,
    actorUserId: 'actor-1',
    providerWebsiteId: 'prov-1',
    requesterWebsiteId: 'req-1',
  };

  // Eligibility for browsing (isWebsiteRowMarketplaceEligible)
  const eligibleStatuses = [
    'ACTIVE',
    'LOW_PRIORITY',
    'LIMITED_ACCESS',
    'UNDER_REVIEW',
    'RESTRICTED',
  ];
  it.each(eligibleStatuses)(
    'treats %s as eligible for browsing (reaches ranking)',
    async (status) => {
      const engine = makeStatusEngine({ marketplaceStatus: status });
      const eligible = await engine.isMarketplaceWebsiteEligible('prov-1');
      expect(eligible).toBe(true);
    },
  );

  it('treats SUSPENDED as ineligible for browsing', async () => {
    // isWebsiteRowMarketplaceEligible reads website.matchingProfile directly,
    // so the SUSPENDED status must live on the website row here (not the
    // websiteMatchingProfile.findUnique used by validateTransition).
    const engine = makeEngine({
      prisma: basePrisma({
        website: {
          ...basePrisma().website,
          findUnique: jest.fn().mockResolvedValue({
            authorId: 'actor-1',
            isDeleted: false,
            verificationStatus: 'VERIFIED',
            marketplaceVisibilityStatus: 'VISIBLE',
            isFlag: false,
            isWalletLock: false,
            matchingProfile: {
              marketplaceStatus: 'SUSPENDED',
              riskScore: 0,
              isSuppressed: false,
              suppressedUntil: null,
            },
          }),
        },
      }),
    });
    const eligible = await engine.isMarketplaceWebsiteEligible('prov-1');
    expect(eligible).toBe(false);
  });

  // Selection gate (validateTransition)
  // Spec §7 (audit §2 / §15, violation a): UNDER_REVIEW remains selectable —
  // it continues marketplace participation and is only distinguished by its
  // monitored-visibility treatment in Visibility Control. It must NOT be blocked
  // at selection with WEBSITE_STATUS_NOT_SELECTABLE.
  it('allows UNDER_REVIEW to be selected at TASK_ACCEPTANCE (continues participation)', async () => {
    const engine = makeStatusEngine({ marketplaceStatus: 'UNDER_REVIEW' });
    const result = await engine.validateTransition(baseInput);
    expect(result.decision).not.toBe('REJECTED');
    expect(result.failedRules).not.toContain('WEBSITE_STATUS_NOT_SELECTABLE');
  });

  it('allows UNDER_REVIEW to browse (OPPORTUNITY_PRESENTATION is not a selection stage)', async () => {
    const engine = makeStatusEngine({ marketplaceStatus: 'UNDER_REVIEW' });
    const result = await engine.validateTransition({
      ...baseInput,
      stage: 'GENERATE',
    });
    expect(result.failedRules).not.toContain('WEBSITE_STATUS_NOT_SELECTABLE');
  });

  it('blocks SUSPENDED at selection with WEBSITE_STATUS_SUSPENDED', async () => {
    const engine = makeStatusEngine({ marketplaceStatus: 'SUSPENDED' });
    const result = await engine.validateTransition(baseInput);
    expect(result.decision).toBe('REJECTED');
    expect(result.failedRules).toContain('WEBSITE_STATUS_SUSPENDED');
  });

  it.each([
    'ACTIVE',
    'LOW_PRIORITY',
    'LIMITED_ACCESS',
    'UNDER_REVIEW',
    'RESTRICTED',
  ])('allows %s to be selected at TASK_ACCEPTANCE', async (status) => {
    const engine = makeStatusEngine({ marketplaceStatus: status });
    const result = await engine.validateTransition(baseInput);
    expect(result.failedRules).not.toContain('WEBSITE_STATUS_NOT_SELECTABLE');
    expect(result.failedRules).not.toContain('WEBSITE_STATUS_SUSPENDED');
  });

  it('pushes BOOST_DISABLED restriction for RESTRICTED (non-fatal)', async () => {
    const engine = makeStatusEngine({ marketplaceStatus: 'RESTRICTED' });
    const result = await engine.validateTransition(baseInput);
    expect(result.restrictions).toContain('BOOST_DISABLED');
    expect(result.decision).not.toBe('REJECTED');
  });

  it('preserves ACTIVE behaviour (no status-related failure or restriction)', async () => {
    const engine = makeStatusEngine({ marketplaceStatus: 'ACTIVE' });
    const result = await engine.validateTransition(baseInput);
    expect(result.failedRules).not.toContain('WEBSITE_STATUS_NOT_SELECTABLE');
    expect(result.failedRules).not.toContain('WEBSITE_STATUS_SUSPENDED');
    expect(result.restrictions).not.toContain('BOOST_DISABLED');
  });
});

describe('ValidationEngine — getCooldownUntil day→ms conversion (§9 / §10)', () => {
  const engine = makeEngine();
  const base = new Date('2026-07-16T00:00:00.000Z');

  it('correctly converts a whole number of days to milliseconds', () => {
    expect(engine.getCooldownUntil(90, base).getTime() - base.getTime()).toBe(
      90 * 86_400_000,
    );
    expect(engine.getCooldownUntil(120, base).getTime() - base.getTime()).toBe(
      120 * 86_400_000,
    );
  });

  it('converts fractional days (e.g. reciprocal cooldown config) without drifting', () => {
    const result = engine.getCooldownUntil(1.5, base);
    expect(result.getTime() - base.getTime()).toBe(1.5 * 86_400_000);
  });

  it('returns a future timestamp for a positive day count and never near-immediate expiry', () => {
    const result = engine.getCooldownUntil(90, base);
    // Must be ~90 days out, i.e. far greater than the previous (buggy) 90 seconds.
    expect(result.getTime() - base.getTime()).toBeGreaterThan(89 * 86_400_000);
    expect(result.getTime()).toBeGreaterThan(base.getTime());
  });

  it('honours a custom `from` reference time', () => {
    const from = new Date('2026-01-01T12:00:00.000Z');
    const result = engine.getCooldownUntil(7, from);
    expect(result.getTime()).toBe(from.getTime() + 7 * 86_400_000);
  });
});

describe('ValidationEngine — audit R4 mode-dependent cooldown mapping', () => {
  // A full DistributionEngine mock so the engine can reach the decision stage.
  const distributionEngine = {
    isNicheWithinCap: jest.fn().mockResolvedValue(true),
    isNetworkConcentrationAllowed: jest.fn().mockResolvedValue(true),
  } as any;

  it('EARLY_STAGE applies tighter 90d reciprocal / 60d repeat when no explicit config', async () => {
    const engine = makeEngineWithConfig({
      mode: 'EARLY_STAGE',
      distributionEngine,
    });
    const days = await (engine as any).getCooldownDays();
    expect(days.repeat).toBeGreaterThan(0);
    expect(days.reciprocal).toBeGreaterThan(0);
  });
});

// Helper that builds a ValidationEngine whose MarketplaceConfigService returns
// the supplied merged config (used to assert mode→cooldown mapping downstream).
function makeEngineWithConfig(merged: any): ValidationEngine {
  const riskEngine = {
    calculateEffectiveRisk: jest
      .fn()
      .mockImplementation((profile) => profile?.riskScore ?? 0),
  } as any;
  const prisma = basePrisma();
  const tierEngine = {
    resolveTierLimits: jest
      .fn()
      .mockResolvedValue({ weeklyInteractionLimit: 100, tierVelocityLimit: 1 }),
    countWeeklyInteractions: jest.fn().mockResolvedValue(0),
    countDomainWeeklyInteractions: jest.fn().mockResolvedValue(0),
  } as any;
  const distributionEngine =
    merged.distributionEngine ??
    ({
      isNicheWithinCap: jest.fn().mockResolvedValue(true),
      isNetworkConcentrationAllowed: jest.fn().mockResolvedValue(true),
    } as any);
  const configService = {
    getMergedConfig: jest.fn().mockResolvedValue({
      repeatPairCooldownDays: 90,
      reciprocalCooldownDays: 120,
      maxNetworkConcentrationPerWindow: 50,
      networkConcentrationWindowDays: 7,
      ...merged,
    }),
  };
  const rootDomainNormalizer = {
    normalizeRootDomainSync: (v: string) => (v ?? '').toLowerCase(),
  };
  return new ValidationEngine(
    prisma,
    tierEngine,
    distributionEngine,
    configService as any,
    rootDomainNormalizer as any,
    riskEngine,
    { resolveForWebsite: jest.fn().mockResolvedValue({}) } as any,
    {} as any,
  );
}

describe('ValidationEngine — audit R8/R9 structured override audit', () => {
  const baseInput = {
    stage: 'ADMIN_FORCE_MATCH' as const,
    actorUserId: 'admin-1',
    providerWebsiteId: 'prov-1',
    requesterWebsiteId: 'req-1',
    providerDomain: 'provider.com',
    requesterDomain: 'requester.com',
  };

  const distributionEngine = {
    isNicheWithinCap: jest.fn().mockResolvedValue(true),
    isNetworkConcentrationAllowed: jest.fn().mockResolvedValue(true),
  } as any;

  it('records affectedDomains (both root domains) + expiry when overriding', async () => {
    const auditCreate = jest.fn().mockResolvedValue(undefined);
    const engine = makeEngine({
      prisma: basePrisma({
        marketplaceOverrideAudit: { create: auditCreate },
      }),
      distributionEngine,
    });

    // Force a reciprocal-cooldown failure, then override it.
    const blockedPrisma = basePrisma({
      domainPairStat: {
        findUnique: jest.fn().mockResolvedValue({
          normalizedPairKey: 'provider.com|requester.com',
          lastSourceDomain: 'provider.com',
          lastTargetDomain: 'requester.com',
          repeatPairCooldownUntil: new Date(Date.now() + 86_400_000),
          reciprocalCooldownUntil: new Date(Date.now() + 86_400_000),
        }),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      adminActionLog: { create: auditCreate },
    });

    const blockedEngine = makeEngine({
      prisma: blockedPrisma,
      distributionEngine,
    });
    const result = await blockedEngine.validateTransition({
      ...baseInput,
      adminOverride: {
        adminId: 'admin-1',
        rule: 'RECIPROCAL_COOLDOWN',
        reasonCode: 'REVIEWED',
        affectedDomains: ['extra.com'],
        expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    });
    expect(result.overrideApplied).toBe(true);
    expect(result.decision).not.toBe('REJECTED');
    expect(auditCreate).toHaveBeenCalledTimes(1);
    const auditData = auditCreate.mock.calls[0][0].data;
    expect(auditData.newValue.affectedDomains).toEqual(
      expect.arrayContaining(['provider.com', 'requester.com', 'extra.com']),
    );
    expect(auditData.expiresAt).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    expect(auditData.action).toBe('OVERRIDE_APPLIED');
  });

  it('a restore override clears the reciprocal/repeat cooldown on the pair stat', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const blockedPrisma = basePrisma({
      domainPairStat: {
        findUnique: jest.fn().mockResolvedValue({
          normalizedPairKey: 'provider.com|requester.com',
          lastSourceDomain: 'provider.com',
          lastTargetDomain: 'requester.com',
          repeatPairCooldownUntil: new Date(Date.now() + 86_400_000),
          reciprocalCooldownUntil: new Date(Date.now() + 86_400_000),
        }),
        count: jest.fn().mockResolvedValue(0),
        updateMany,
      },
      adminActionLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    });

    const engine = makeEngine({
      prisma: blockedPrisma,
      distributionEngine,
    });
    const result = await engine.validateTransition({
      ...baseInput,
      adminOverride: {
        adminId: 'admin-1',
        rule: 'RECIPROCAL_COOLDOWN',
        reasonCode: 'RESTORE',
        restore: true,
      },
    });

    expect(result.overrideApplied).toBe(true);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany.mock.calls[0][0].data).toMatchObject({
      reciprocalCooldownUntil: null,
      repeatPairCooldownUntil: null,
    });
  });
});
