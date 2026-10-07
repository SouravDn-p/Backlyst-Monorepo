import { NotFoundException } from '@nestjs/common';
import { WebsiteStatusService } from './admin-website-status.service';

function makeService(over: any = {}) {
  const website = {
    findUnique: jest
      .fn()
      .mockResolvedValue(
        over.websiteFindUnique ?? { id: 'web-1', authorId: 'u-1' },
      ),
  };
  // Allow callers to force a "website not found" by passing a null value.
  if (over.websiteFindUnique === null) {
    website.findUnique = jest.fn().mockResolvedValue(null);
  }
  const websiteMatchingProfile = {
    // Captures pre-change state for the audit row (spec §16).
    findUnique: jest
      .fn()
      .mockResolvedValue(over.matchingProfileFindUnique ?? null),
    upsert: jest.fn().mockImplementation((args: any) =>
      Promise.resolve({
        websiteId: args.where.websiteId,
        marketplaceStatus:
          args.create?.marketplaceStatus ?? args.update?.marketplaceStatus,
        marketplaceStatusDailyCap:
          args.create?.marketplaceStatusDailyCap ??
          args.update?.marketplaceStatusDailyCap ??
          null,
      }),
    ),
  };
  // Best-effort audit log write (spec §16) — never blocks the response.
  const websiteQualityStatusLog = {
    create: jest.fn().mockResolvedValue({ id: 'log-1' }),
  };
  const prisma: any = {
    website,
    websiteMatchingProfile,
    websiteQualityStatusLog,
    adminActionLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) },
    ...over.prisma,
  };
  prisma.$transaction = jest.fn().mockImplementation((cb) => {
    if (typeof cb === 'function') return cb(prisma);
    return cb;
  });
  // Spec §6: the service now delegates on-demand recompute to ScoringService.
  const scoringService = {
    recomputeQualityForWebsite: jest
      .fn()
      .mockResolvedValue({
        websiteId: 'web-1',
        changed: false,
        qualityScore: 50,
      }),
  };
  return {
    service: new WebsiteStatusService(prisma, scoringService as any),
    prisma,
    scoringService,
  };
}

const baseDto = {
  websiteId: 'web-1',
  status: 'LOW_PRIORITY' as const,
  reasonCode: 'MANUAL',
};

describe('WebsiteStatusService — T6 admin status transitions (spec §7)', () => {
  it('throws NotFoundException when the website does not exist', async () => {
    const { service } = makeService({
      websiteFindUnique: null,
    });
    await expect(service.setStatus('admin-1', baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('sets the marketplace status on the matching profile', async () => {
    const { service, prisma } = makeService();
    const res = await service.setStatus('admin-1', {
      ...baseDto,
      status: 'RESTRICTED',
    });
    expect(res.success).toBe(true);
    expect(prisma.websiteMatchingProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { websiteId: 'web-1' },
        update: {
          marketplaceStatus: 'RESTRICTED',
          marketplaceStatusDailyCap: null,
        },
      }),
    );
    expect(res.data!.marketplaceStatus).toBe('RESTRICTED');
  });

  it('stores a per-profile daily cap for LIMITED_ACCESS and RESTRICTED', async () => {
    const { service, prisma } = makeService();
    await service.setStatus('admin-1', {
      ...baseDto,
      status: 'LIMITED_ACCESS',
      dailyCap: 1,
    });
    expect(prisma.websiteMatchingProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          marketplaceStatus: 'LIMITED_ACCESS',
          marketplaceStatusDailyCap: 1,
        },
      }),
    );

    await service.setStatus('admin-1', {
      ...baseDto,
      status: 'RESTRICTED',
      dailyCap: 2,
    });
    expect(prisma.websiteMatchingProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          marketplaceStatus: 'RESTRICTED',
          marketplaceStatusDailyCap: 2,
        },
      }),
    );
  });

  it('clears any daily cap when switching away from a capped status', async () => {
    const { service, prisma } = makeService();
    await service.setStatus('admin-1', {
      ...baseDto,
      status: 'ACTIVE',
      dailyCap: 1, // should be ignored for non-capped statuses
    });
    expect(prisma.websiteMatchingProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          marketplaceStatus: 'ACTIVE',
          marketplaceStatusDailyCap: null,
        },
      }),
    );
  });
});

describe('WebsiteStatusService — M12 tier velocity limits (spec §16)', () => {
  it('upserts weekly/tier limits without altering marketplaceStatus', async () => {
    const { service, prisma } = makeService();
    const res = await service.setTierLimits('admin-1', 'web-1', {
      weeklyInteractionLimit: 12,
      tierVelocityLimit: 3,
    });
    expect(prisma.websiteMatchingProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { websiteId: 'web-1' },
        create: expect.objectContaining({
          weeklyInteractionLimit: 12,
          tierVelocityLimit: 3,
        }),
        update: { weeklyInteractionLimit: 12, tierVelocityLimit: 3 },
      }),
    );
    const call = prisma.websiteMatchingProfile.upsert.mock.calls[0][0];
    expect(call.update).not.toHaveProperty('marketplaceStatus');
    expect(res.success).toBe(true);
    expect(res.data!.websiteId).toBe('web-1');
  });

  it('throws NotFoundException when the website does not exist', async () => {
    const { service } = makeService({ websiteFindUnique: null });
    await expect(
      service.setTierLimits('admin-1', 'missing', {
        weeklyInteractionLimit: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
