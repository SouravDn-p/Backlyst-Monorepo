import {
  BadgeRewardType,
  RewardBenefitStatus,
} from '@prisma/client';
import { RewardBenefitService } from './reward-benefit.service';

describe('RewardBenefitService', () => {
  function createService() {
    const prisma = {
      userRewardBenefit: {
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const service = new RewardBenefitService(prisma as any);
    return { service, prisma };
  }

  it('creates an active benefit when no existing benefit exists', async () => {
    const { service, prisma } = createService();
    prisma.userRewardBenefit.findMany.mockResolvedValue([]);
    prisma.userRewardBenefit.create.mockResolvedValue({
      id: 'benefit-1',
      status: RewardBenefitStatus.ACTIVE,
    });

    const result = await service.upsertBenefit({
      userId: 'user-1',
      rewardCode: 'HIGH_APPROVAL',
      rewardType: BadgeRewardType.VISIBILITY_BOOST,
    });

    expect(prisma.userRewardBenefit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          rewardCode: 'HIGH_APPROVAL',
          status: RewardBenefitStatus.ACTIVE,
        }),
      }),
    );
    expect(result).toEqual({
      benefit: {
        id: 'benefit-1',
        status: RewardBenefitStatus.ACTIVE,
      },
      created: true,
      previousStatus: null,
      selfHealedDuplicateIds: [],
    });
  });

  it('self-heals duplicate active benefits and keeps the newest row active', async () => {
    const { service, prisma } = createService();
    const existing = {
      id: 'benefit-active',
      activatedAt: new Date('2026-07-01T00:00:00.000Z'),
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-02T00:00:00.000Z'),
    };
    prisma.userRewardBenefit.findMany.mockResolvedValue([
      existing,
      {
        id: 'benefit-dup-1',
        createdAt: new Date('2026-06-29T00:00:00.000Z'),
        updatedAt: new Date('2026-06-30T00:00:00.000Z'),
      },
      {
        id: 'benefit-dup-2',
        createdAt: new Date('2026-06-28T00:00:00.000Z'),
        updatedAt: new Date('2026-06-29T00:00:00.000Z'),
      },
    ]);
    prisma.userRewardBenefit.update.mockResolvedValue({
      id: 'benefit-active',
      status: RewardBenefitStatus.ACTIVE,
    });
    prisma.userRewardBenefit.updateMany.mockResolvedValue({ count: 2 });

    await service.upsertBenefit({
      userId: 'user-1',
      rewardCode: 'TOP_CONTRIBUTOR',
      rewardType: BadgeRewardType.PRIORITY_BOOST,
      sourceBadgeId: 'badge-1',
    });

    expect(prisma.userRewardBenefit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'benefit-active' },
      }),
    );
    expect(prisma.userRewardBenefit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ['benefit-dup-1', 'benefit-dup-2'] },
          status: RewardBenefitStatus.ACTIVE,
        },
        data: expect.objectContaining({
          status: RewardBenefitStatus.INACTIVE,
        }),
      }),
    );
  });

  it('deactivates active benefits for a badge without deleting history', async () => {
    const { service, prisma } = createService();
    prisma.userRewardBenefit.findMany.mockResolvedValue([
      {
        id: 'benefit-1',
        userId: 'user-1',
        status: RewardBenefitStatus.ACTIVE,
      },
    ]);
    prisma.userRewardBenefit.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.deactivateBenefitsForBadge(
      'user-1',
      'badge-1',
    );

    expect(prisma.userRewardBenefit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['benefit-1'] } },
        data: expect.objectContaining({
          status: RewardBenefitStatus.INACTIVE,
        }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(RewardBenefitStatus.INACTIVE);
  });

  it('does not expire already non-active benefits twice', async () => {
    const { service, prisma } = createService();
    prisma.userRewardBenefit.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.expireBenefits(['benefit-1', 'benefit-2']);

    expect(prisma.userRewardBenefit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ['benefit-1', 'benefit-2'] },
          status: RewardBenefitStatus.ACTIVE,
        },
        data: expect.objectContaining({
          status: RewardBenefitStatus.EXPIRED,
        }),
      }),
    );
    expect(result).toBe(1);
  });
});
