import { RewardBenefitStatus, UserBadgeStatus } from '@prisma/client';
import { UserRewardProfileService } from './user-reward-profile.service';

describe('UserRewardProfileService', () => {
  function createService() {
    const prisma = {
      userRewardProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const service = new UserRewardProfileService(prisma as any);
    return { service, prisma };
  }

  it('syncBadgeAndRewardCounts counts only earned and active badges', async () => {
    const { service, prisma } = createService();
    prisma.userRewardProfile.upsert.mockResolvedValue({});
    const tx = {
      userBadge: { count: jest.fn().mockResolvedValue(2) },
      userRewardBenefit: { count: jest.fn().mockResolvedValue(1) },
      userRewardProfile: prisma.userRewardProfile,
    };

    await service.syncBadgeAndRewardCounts('user-1', tx as any);

    expect(tx.userBadge.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          status: { in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE] },
        },
      }),
    );
  });

  it('refreshUserRewardProfile does not count inactive or revoked badges in earnedBadgeCount', async () => {
    const { service } = createService();
    const db = {
      placementTask: {
        count: jest
          .fn()
          .mockResolvedValueOnce(5)
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(4)
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(0),
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ requesterId: 'r1' }, { requesterId: 'r2' }])
          .mockResolvedValueOnce([{ selectedProviderId: 'p1' }])
          .mockResolvedValueOnce([{ requesterWebsiteId: 'w1' }]),
      },
      websiteVerifiedPlacement: { count: jest.fn().mockResolvedValue(7) },
      websiteActivityStreak: {
        aggregate: jest.fn().mockResolvedValue({
          _max: { currentStreakWeeks: 2, longestStreakWeeks: 4 },
        }),
      },
      userBadge: { count: jest.fn().mockResolvedValue(2) },
      userRewardBenefit: {
        count: jest.fn().mockResolvedValue(1),
      },
      userRewardProfile: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    await (service as any).refreshUserRewardProfile(db, 'user-1');

    expect(db.userBadge.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          status: { in: [UserBadgeStatus.EARNED, UserBadgeStatus.ACTIVE] },
        },
      }),
    );
    expect(db.userRewardProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ earnedBadgeCount: 2 }),
        update: expect.objectContaining({ earnedBadgeCount: 2 }),
      }),
    );
  });
});
