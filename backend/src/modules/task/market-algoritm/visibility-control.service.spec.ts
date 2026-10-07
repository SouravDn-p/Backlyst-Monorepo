import { VisibilityControlService } from './visibility-control.service';
import { RankedMatchCandidate } from './matching.types';
import { WebsiteStatusQueryService } from './website-status-query.service';

// Minimal Prisma mock — VisibilityControlService only writes to
// visibilityAdjustmentLog (best-effort). We capture the rows for assertions.
function makePrisma() {
  const rows: any[] = [];
  const prisma: any = {
    visibilityAdjustmentLog: {
      createMany: ({ data }: { data: any[] }) => {
        rows.push(...data);
        return Promise.resolve({ count: data.length });
      },
    },
  };
  return { rows, prisma };
}

// Minimal WebsiteStatusQueryService stub — the UNDER_REVIEW behavioural
// monitoring hook now lives here. We capture calls but never resolve/reject so
// the apply() path stays unaffected (the call is fire-and-forget).
function makeWebsiteStatusQuery() {
  const websiteStatusQuery: any = {
    recordUnderReviewMonitoring: jest.fn().mockResolvedValue(undefined),
  };
  return { websiteStatusQuery };
}

function profile(over: any = {}) {
  return {
    visibilityScore: 50,
    opportunityScore: 50,
    reputationScore: 50,
    boostFactor: 2.5,
    riskScore: 0,
    isSuppressed: false,
    suppressedUntil: null,
    forceMatchNext: false,
    exposureCount7d: 0,
    internalPriorityScore: 50,
    diversityScore: 50,
    marketplaceStatus: 'ACTIVE',
    marketplaceStatusDailyCap: null,
    ...over,
  };
}

let counter = 0;
function candidate(status: string, over: any = {}): RankedMatchCandidate {
  counter += 1;
  const id = `prov-web-${counter}`; // first call in a test => prov-web-1
  return {
    task: {
      id: `task-${counter}`,
      requesterId: 'req-user',
      requesterWebsiteId: 'req-web',
      placementType: 'ANY',
      linkAttribute: 'ANY',
      matchingAttributes: { authority: 'MEETS' },
    },
    providerWebsite: {
      id,
      authorId: 'prov-user',
      rootDomain: 'provider.com',
      websiteUrl: 'https://provider.com',
      industry: 'seo',
      country: null,
      language: null,
      domainRating: null,
      primaryCategoryKey: null,
      secondaryCategoryKey: null,
      matchingProfile: profile({ marketplaceStatus: status, ...over }),
    },
    score: 100,
    rank: counter,
  } as unknown as RankedMatchCandidate;
}

const config: any = {
  restrictedVisibilityFactor: 0.4,
  underReviewVisibilityFactor: 0.7,
  restrictedDailyCapFactor: 0.34,
  maxProviderMatchesPerDay: 3,
};

function ctx(
  dailyProviderWebsiteCounts: Map<string, number> = new Map(),
  overridesByWebsite: Map<string, any> = new Map(),
) {
  return {
    providerId: 'prov-user',
    marketplaceMode: 'NORMAL' as const,
    dailyProviderWebsiteCounts,
    overridesByWebsite,
  };
}

describe('VisibilityControlService (spec §5 / audit §21-R9)', () => {
  // Reset the id counter before each test so the first candidate is always
  // `prov-web-1` (the count keys below rely on this).
  beforeEach(() => {
    counter = 0;
  });

  it('RESTRICTED gets a significant visibility reduction (×0.4) on top of ranking', async () => {
    const { prisma } = makePrisma();
    const { websiteStatusQuery } = makeWebsiteStatusQuery();
    const svc = new VisibilityControlService(prisma, websiteStatusQuery);
    const ranked = [candidate('RESTRICTED'), candidate('ACTIVE')];
    const out = await svc.apply(ranked, config, ctx(new Map()));
    const restricted = out.find(
      (c) =>
        c.providerWebsite.matchingProfile?.marketplaceStatus === 'RESTRICTED',
    );
    const active = out.find(
      (c) => c.providerWebsite.matchingProfile?.marketplaceStatus === 'ACTIVE',
    );
    expect(restricted?.score).toBe(40); // 100 * 0.4
    expect(active?.score).toBe(100); // unchanged
  });

  it('UNDER_REVIEW gets a monitored visibility reduction (×0.7) and a monitored flag', async () => {
    const { prisma } = makePrisma();
    const { websiteStatusQuery } = makeWebsiteStatusQuery();
    const svc = new VisibilityControlService(prisma, websiteStatusQuery);
    const ranked = [candidate('UNDER_REVIEW')];
    const out = await svc.apply(ranked, config, ctx(new Map()));
    expect(out[0].score).toBe(70); // 100 * 0.7
    expect((out[0] as any).visibilityMonitored).toBe(true);
    // The under-review behavioural-monitoring hook is fired exactly once.
    expect(
      websiteStatusQuery.recordUnderReviewMonitoring,
    ).toHaveBeenCalledTimes(1);
  });

  it('ACTIVE / LOW_PRIORITY are unchanged by visibility control', async () => {
    const { prisma } = makePrisma();
    const { websiteStatusQuery } = makeWebsiteStatusQuery();
    const svc = new VisibilityControlService(prisma, websiteStatusQuery);
    const ranked = [candidate('ACTIVE'), candidate('LOW_PRIORITY')];
    const out = await svc.apply(ranked, config, ctx(new Map()));
    out.forEach((c) => expect(c.score).toBe(100));
  });

  it('RESTRICTED is dropped when its reduced daily cap is already reached', async () => {
    const { prisma, rows } = makePrisma();
    const { websiteStatusQuery } = makeWebsiteStatusQuery();
    const svc = new VisibilityControlService(prisma, websiteStatusQuery);
    const ranked = [candidate('RESTRICTED')];
    // reduced cap = floor(3 * 0.34) = 1, used = 1 => dropped
    const out = await svc.apply(
      ranked,
      config,
      ctx(new Map([['prov-web-1', 1]])),
    );
    expect(out.length).toBe(0);
    expect(rows.some((r) => r.reasonCode === 'RESTRICTED_DAILY_CAP')).toBe(
      true,
    );
  });

  it('RESTRICTED keeps participating when under the reduced cap', async () => {
    const { prisma } = makePrisma();
    const { websiteStatusQuery } = makeWebsiteStatusQuery();
    const svc = new VisibilityControlService(prisma, websiteStatusQuery);
    const ranked = [candidate('RESTRICTED')];
    const out = await svc.apply(
      ranked,
      config,
      ctx(new Map([['prov-web-1', 0]])),
    );
    expect(out.length).toBe(1);
  });

  it('RESTRICTED honours an admin-set per-profile daily cap (setStatus)', async () => {
    const { prisma } = makePrisma();
    const { websiteStatusQuery } = makeWebsiteStatusQuery();
    const svc = new VisibilityControlService(prisma, websiteStatusQuery);
    const ranked = [candidate('RESTRICTED', { marketplaceStatusDailyCap: 2 })];
    // cap = 2, used = 2 => dropped
    const out = await svc.apply(
      ranked,
      config,
      ctx(new Map([['prov-web-1', 2]])),
    );
    expect(out.length).toBe(0);
  });

  it('logs every status-factor + override adjustment to VisibilityAdjustmentLog', async () => {
    const { prisma, rows } = makePrisma();
    const { websiteStatusQuery } = makeWebsiteStatusQuery();
    const svc = new VisibilityControlService(prisma, websiteStatusQuery);
    const overrides = new Map([['prov-web-1', { boostValue: 5 }]]);
    const ranked = [
      candidate('RESTRICTED'),
      candidate('UNDER_REVIEW'),
      candidate('ACTIVE'),
    ];
    await svc.apply(ranked, config, ctx(new Map(), overrides));
    expect(
      rows.filter((r) => r.adjustmentType === 'STATUS_FACTOR').length,
    ).toBe(2);
    expect(rows.some((r) => r.adjustmentType === 'OVERRIDE_APPLIED')).toBe(
      true,
    );
  });

  it('never throws / blocks the response when log persistence fails', async () => {
    const failingPrisma: any = {
      visibilityAdjustmentLog: {
        createMany: () => Promise.reject(new Error('db down')),
      },
    };
    const { websiteStatusQuery } = makeWebsiteStatusQuery();
    const svc = new VisibilityControlService(failingPrisma, websiteStatusQuery);
    const ranked = [candidate('RESTRICTED')];
    const out = await svc.apply(
      ranked,
      config,
      ctx(new Map([['prov-web-1', 0]])),
    );
    // Falls back: still returns the visibility-adjusted candidates.
    expect(out.length).toBe(1);
    expect(out[0].score).toBe(40);
  });
});
