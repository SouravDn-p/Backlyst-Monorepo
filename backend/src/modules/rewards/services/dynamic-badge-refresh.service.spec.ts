import {
  RewardBenefitStatus,
  RewardLedgerType,
  UserBadgeStatus,
} from '@prisma/client';
import { REWARD_AUDIT_ACTIONS } from '../enums';
import { DynamicBadgeRefreshService } from './dynamic-badge-refresh.service';

describe('DynamicBadgeRefreshService', () => {
  function createService() {
    const prisma = {
      userBadge: {
        findMany: jest.fn(),
      },
      userRewardBenefit: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const badgeEngineService = {
      evaluateUserBadges: jest.fn(),
    };

    const rewardLedgerService = {
      writeRewardBenefitEvent: jest.fn(),
    };

    const rewardAuditService = {
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
      record: jest.fn(),
    };

    const service = new DynamicBadgeRefreshService(
      prisma as any,
      badgeEngineService as any,
      rewardLedgerService as any,
      rewardAuditService as any,
    );

    return {
      service,
      prisma,
      badgeEngineService,
      rewardLedgerService,
      rewardAuditService,
    };
  }

  it('refreshDueBadges evaluates due active dynamic badges and writes summary audit rows', async () => {
    const { service, prisma, badgeEngineService, rewardAuditService } = createService();

    prisma.userBadge.findMany
      .mockResolvedValueOnce([
        { userId: 'user-1' },
        { userId: 'user-1' },
        { userId: 'user-2' },
      ])
      .mockResolvedValueOnce([
        { badgeId: 'badge-1', status: UserBadgeStatus.ELIGIBLE },
      ])
      .mockResolvedValueOnce([
        { badgeId: 'badge-1', status: UserBadgeStatus.ACTIVE },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    badgeEngineService.evaluateUserBadges
      .mockResolvedValueOnce({ evaluated: 1, changed: 1 })
      .mockRejectedValueOnce(new Error('refresh failed'));

    const result = await service.refreshDueBadges({ limit: 20 });

    expect(badgeEngineService.evaluateUserBadges).toHaveBeenNthCalledWith(1, {
      userId: 'user-1',
      roleContext: 'ANY',
    });
    expect(badgeEngineService.evaluateUserBadges).toHaveBeenNthCalledWith(2, {
      userId: 'user-2',
      roleContext: 'ANY',
    });
    expect(result.data!.failed).toBe(1);
    expect(rewardAuditService.recordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.DYNAMIC_REFRESH_STARTED,
      }),
    );
    expect(rewardAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.DYNAMIC_REFRESH_FAILED,
      }),
    );
  });

  it('expires stale active benefits and writes ledger + audit events', async () => {
    const { service, prisma, rewardLedgerService, rewardAuditService } = createService();
    prisma.userRewardBenefit.findMany.mockResolvedValue([
      {
        id: 'benefit-1',
        userId: 'user-1',
        sourceBadgeId: 'badge-1',
        sourceTaskId: 'task-1',
        rewardCode: 'FAST_RESPONDER',
        rewardType: 'PRIORITY_BOOST',
        value: 10,
        expiresAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ]);
    prisma.userRewardBenefit.updateMany.mockResolvedValue({ count: 1 });
    rewardLedgerService.writeRewardBenefitEvent.mockResolvedValue({
      created: true,
      entry: { id: 'ledger-1' },
    });

    const result = await service.expireStaleBenefits({ limit: 10 });

    expect(prisma.userRewardBenefit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'benefit-1',
          status: RewardBenefitStatus.ACTIVE,
        },
        data: expect.objectContaining({
          status: RewardBenefitStatus.EXPIRED,
        }),
      }),
    );
    expect(rewardLedgerService.writeRewardBenefitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        rewardType: RewardLedgerType.BADGE_EXPIRED,
      }),
    );
    expect(rewardAuditService.recordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.REWARD_BENEFIT_EXPIRED,
      }),
    );
    expect(result.data!.expired).toBe(1);
  });

  it('runDailyMaintenance catches failures and does not throw', async () => {
    const { service } = createService();
    jest
      .spyOn(service, 'refreshDueBadges')
      .mockRejectedValueOnce(new Error('cron refresh failed'));

    await expect(service.runDailyMaintenance()).resolves.toBeUndefined();
  });
});
