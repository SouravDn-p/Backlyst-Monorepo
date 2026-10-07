import {
  BadgeCategory,
  BadgeRewardType,
  BadgeRoleScope,
  BadgeScope,
  BadgeTriggerType,
  UserBadgeStatus,
} from '@prisma/client';
import {
  REWARD_AUDIT_ACTIONS,
} from '../enums';
import { BadgeEngineService } from './badge-engine.service';

describe('BadgeEngineService', () => {
  function buildDefinition(overrides: Record<string, unknown> = {}) {
    return {
      id: 'badge-1',
      code: 'FIRST_SUCCESS',
      name: 'First Success',
      category: BadgeCategory.MARKETPLACE,
      requirementText: null,
      rewardImpactText: null,
      badgeScope: BadgeScope.USER_PROFILE,
      roleScope: BadgeRoleScope.ANY,
      triggerType: BadgeTriggerType.FIRST_SUCCESS,
      threshold: 1,
      secondaryThreshold: null,
      isPersistent: true,
      isActive: true,
      rewardType: BadgeRewardType.RECOGNITION_ONLY,
      rewardValue: null,
      rewardMeta: null,
      validityDays: null,
      refreshWindowDays: null,
      gracePeriodDays: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function createService() {
    const tx = {
      userBadge: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const prisma = {
      user: { findUnique: jest.fn() },
      badgeDefinition: { findMany: jest.fn() },
      $transaction: jest.fn(async (callback: (client: any) => Promise<unknown>) =>
        callback(tx),
      ),
    };

    const badgeRuleEvaluatorService = {
      evaluate: jest.fn(),
    };

    const badgeRewardImpactService = {
      syncBadgeRewardBenefit: jest.fn(),
      deactivateBadgeRewardBenefit: jest.fn(),
    };

    const rewardLedgerService = {
      writeBadgeEvent: jest.fn(),
    };

    const userRewardProfileService = {
      getOrCreateProfile: jest.fn(),
      syncBadgeAndRewardCounts: jest.fn(),
    };

    const rewardAuditService = {
      recordSuccess: jest.fn(),
    };

    const rewardNotificationService = {
      notifyBadgeUnlocked: jest.fn(),
      notifyBadgeActivated: jest.fn(),
    };

    const service = new BadgeEngineService(
      prisma as any,
      badgeRuleEvaluatorService as any,
      badgeRewardImpactService as any,
      rewardLedgerService as any,
      userRewardProfileService as any,
      rewardAuditService as any,
      rewardNotificationService as any,
    );

    return {
      service,
      prisma,
      tx,
      badgeRuleEvaluatorService,
      badgeRewardImpactService,
      rewardLedgerService,
      userRewardProfileService,
      rewardAuditService,
      rewardNotificationService,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('earns FIRST_SUCCESS when the rule qualifies', async () => {
    const {
      service,
      prisma,
      tx,
      badgeRuleEvaluatorService,
      rewardLedgerService,
      badgeRewardImpactService,
      userRewardProfileService,
      rewardAuditService,
    } = createService();

    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isVerified: true });
    prisma.badgeDefinition.findMany.mockResolvedValue([buildDefinition()]);
    userRewardProfileService.getOrCreateProfile.mockResolvedValue({ totalApprovedTasks: 1 });
    tx.userBadge.findMany.mockResolvedValue([]);
    badgeRuleEvaluatorService.evaluate.mockReturnValue({
      qualifies: true,
      eligible: true,
      status: 'EARNED',
      progress: {},
      reason: 'Complete the first approved marketplace task.',
    });
    tx.userBadge.upsert.mockResolvedValue({
      id: 'user-badge-1',
      status: UserBadgeStatus.EARNED,
      earnedAt: new Date('2026-07-03T00:00:00.000Z'),
      activatedAt: null,
      deactivatedAt: null,
      revokedAt: null,
      expiresAt: null,
      nextEvaluationAt: null,
    });

    const result = await service.evaluateUserBadges({
      userId: 'user-1',
      roleContext: 'REQUESTER',
      taskId: 'task-1',
    });

    expect(result).toEqual({ evaluated: 1, changed: 1 });
    expect(tx.userBadge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: UserBadgeStatus.EARNED }),
        update: expect.objectContaining({ status: UserBadgeStatus.EARNED }),
      }),
    );
    expect(rewardLedgerService.writeBadgeEvent).toHaveBeenCalled();
    expect(badgeRewardImpactService.syncBadgeRewardBenefit).toHaveBeenCalled();
    expect(rewardAuditService.recordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.BADGE_AUTOMATICALLY_EARNED,
      }),
    );
  });

  it('does not downgrade a permanent EARNED badge', async () => {
    const {
      service,
      prisma,
      tx,
      badgeRuleEvaluatorService,
      rewardLedgerService,
      rewardAuditService,
      userRewardProfileService,
    } = createService();

    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isVerified: true });
    prisma.badgeDefinition.findMany.mockResolvedValue([buildDefinition()]);
    userRewardProfileService.getOrCreateProfile.mockResolvedValue({ totalApprovedTasks: 0 });
    tx.userBadge.findMany.mockResolvedValue([
      {
        badgeId: 'badge-1',
        status: UserBadgeStatus.EARNED,
        earnedAt: new Date('2026-06-01T00:00:00.000Z'),
      },
    ]);
    badgeRuleEvaluatorService.evaluate.mockReturnValue({
      qualifies: false,
      eligible: false,
      status: 'LOCKED',
      progress: {},
      reason: 'No longer qualified.',
    });
    tx.userBadge.upsert.mockResolvedValue({
      id: 'user-badge-1',
      status: UserBadgeStatus.EARNED,
      earnedAt: new Date('2026-06-01T00:00:00.000Z'),
      activatedAt: null,
      deactivatedAt: null,
      revokedAt: null,
      expiresAt: null,
      nextEvaluationAt: null,
    });

    const result = await service.evaluateUserBadges({ userId: 'user-1' });

    expect(result).toEqual({ evaluated: 1, changed: 0 });
    expect(tx.userBadge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: UserBadgeStatus.EARNED }),
      }),
    );
    expect(rewardLedgerService.writeBadgeEvent).toHaveBeenCalled();
    expect(rewardAuditService.recordSuccess).not.toHaveBeenCalled();
  });

  it('does not reactivate a REVOKED badge during automatic evaluation', async () => {
    const {
      service,
      prisma,
      tx,
      badgeRuleEvaluatorService,
      rewardLedgerService,
      badgeRewardImpactService,
      rewardAuditService,
      userRewardProfileService,
    } = createService();

    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isVerified: true });
    prisma.badgeDefinition.findMany.mockResolvedValue([buildDefinition()]);
    userRewardProfileService.getOrCreateProfile.mockResolvedValue({ totalApprovedTasks: 10 });
    tx.userBadge.findMany.mockResolvedValue([
      {
        badgeId: 'badge-1',
        status: UserBadgeStatus.REVOKED,
        revokedAt: new Date('2026-06-20T00:00:00.000Z'),
        metadata: {
          revokedByAdminId: 'admin-1',
          revokeReason: 'Manual admin revoke',
        },
      },
    ]);
    badgeRuleEvaluatorService.evaluate.mockReturnValue({
      qualifies: true,
      eligible: true,
      status: 'EARNED',
      progress: {},
      reason: 'Would qualify again.',
    });
    tx.userBadge.upsert.mockResolvedValue({
      id: 'user-badge-1',
      status: UserBadgeStatus.REVOKED,
    });

    const result = await service.evaluateUserBadges({ userId: 'user-1' });

    expect(result).toEqual({ evaluated: 1, changed: 0 });
    expect(rewardLedgerService.writeBadgeEvent).not.toHaveBeenCalled();
    expect(badgeRewardImpactService.syncBadgeRewardBenefit).not.toHaveBeenCalled();
    expect(rewardAuditService.recordSuccess).not.toHaveBeenCalled();
  });

  it('activates a dynamic badge when qualified', async () => {
    const {
      service,
      prisma,
      tx,
      badgeRuleEvaluatorService,
      rewardLedgerService,
      rewardAuditService,
      userRewardProfileService,
    } = createService();

    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isVerified: true });
    prisma.badgeDefinition.findMany.mockResolvedValue([
      buildDefinition({
        code: 'FAST_RESPONDER',
        triggerType: BadgeTriggerType.RESPONSE_TIME,
        isPersistent: false,
        rewardType: BadgeRewardType.PRIORITY_BOOST,
        refreshWindowDays: 7,
        validityDays: 90,
      }),
    ]);
    userRewardProfileService.getOrCreateProfile.mockResolvedValue({});
    tx.userBadge.findMany.mockResolvedValue([]);
    badgeRuleEvaluatorService.evaluate.mockReturnValue({
      qualifies: true,
      eligible: true,
      status: 'ACTIVE',
      progress: {},
      reason: 'Qualified.',
    });
    tx.userBadge.upsert.mockResolvedValue({
      id: 'user-badge-1',
      status: UserBadgeStatus.ACTIVE,
      earnedAt: null,
      activatedAt: new Date('2026-07-03T00:00:00.000Z'),
      deactivatedAt: null,
      revokedAt: null,
      expiresAt: new Date('2026-10-01T00:00:00.000Z'),
      nextEvaluationAt: new Date('2026-07-10T00:00:00.000Z'),
    });

    const result = await service.evaluateUserBadges({ userId: 'user-1' });

    expect(result).toEqual({ evaluated: 1, changed: 1 });
    expect(rewardLedgerService.writeBadgeEvent).toHaveBeenCalled();
    expect(rewardAuditService.recordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.BADGE_STATUS_CHANGED,
      }),
    );
  });
});
