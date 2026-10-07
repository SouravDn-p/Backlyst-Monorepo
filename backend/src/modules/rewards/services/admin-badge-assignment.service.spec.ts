import {
  BadgeCategory,
  BadgeRewardType,
  BadgeRoleScope,
  BadgeScope,
  BadgeTriggerType,
  RewardBenefitStatus,
  UserBadgeStatus,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { REWARD_AUDIT_ACTIONS } from '../enums';
import { AdminBadgeAssignmentService } from './admin-badge-assignment.service';

describe('AdminBadgeAssignmentService', () => {
  function buildBadge(overrides: Record<string, unknown> = {}) {
    return {
      id: 'badge-1',
      code: 'FOUNDING_MEMBER',
      name: 'Founding Member',
      category: BadgeCategory.KICKSTARTER,
      roleScope: BadgeRoleScope.ANY,
      badgeScope: BadgeScope.USER_PROFILE,
      triggerType: BadgeTriggerType.KICKSTARTER_TIER,
      isPersistent: true,
      isActive: true,
      rewardType: BadgeRewardType.RECOGNITION_ONLY,
      refreshWindowDays: null,
      validityDays: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function createService() {
    const tx = {
      userBadge: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    const prisma = {
      user: { findUnique: jest.fn() },
      badgeDefinition: { findUnique: jest.fn(), findMany: jest.fn() },
      userBadge: { findMany: jest.fn() },
      userRewardBenefit: { findMany: jest.fn(), findFirst: jest.fn() },
      rewardLedger: { findMany: jest.fn() },
      rewardAuditLog: { findMany: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn(async (callback: (client: any) => Promise<unknown>) =>
        callback(tx),
      ),
    };

    const badgeRuleEvaluatorService = { evaluate: jest.fn() };
    const badgeRewardImpactService = {
      syncBadgeRewardBenefit: jest.fn(),
      deactivateBadgeRewardBenefit: jest.fn(),
    };
    const rewardLedgerService = {
      writeBadgeEvent: jest.fn(),
      getUserLedgerSummaryData: jest.fn(),
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

    const service = new AdminBadgeAssignmentService(
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

  it('allows admin to assign FOUNDING_MEMBER without duplication and audits the assignment', async () => {
    const {
      service,
      prisma,
      tx,
      rewardLedgerService,
      badgeRewardImpactService,
      rewardAuditService,
      userRewardProfileService,
    } = createService();

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Demo User',
      email: 'user@example.com',
    });
    prisma.badgeDefinition.findUnique.mockResolvedValue(buildBadge());
    tx.userBadge.findUnique.mockResolvedValue(null);
    tx.userBadge.upsert.mockResolvedValue({
      id: 'user-badge-1',
      status: UserBadgeStatus.EARNED,
      earnedAt: new Date('2026-07-01T00:00:00.000Z'),
      activatedAt: null,
      deactivatedAt: null,
      revokedAt: null,
    });
    rewardLedgerService.writeBadgeEvent.mockResolvedValue({});
    badgeRewardImpactService.syncBadgeRewardBenefit.mockResolvedValue(undefined);
    userRewardProfileService.syncBadgeAndRewardCounts.mockResolvedValue({});

    const result = await service.assignBadgeToUser({
      userId: 'user-1',
      badgeCode: 'FOUNDING_MEMBER',
      adminId: 'admin-1',
      reason: 'Launch cohort',
    });

    expect(result.data!.alreadyAssigned).toBe(false);
    expect(tx.userBadge.upsert).toHaveBeenCalled();
    expect(rewardLedgerService.writeBadgeEvent).toHaveBeenCalled();
    expect(rewardAuditService.recordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.KICKSTARTER_BADGE_ASSIGNED,
      }),
    );
  });

  it('returns alreadyAssigned when the same badge is assigned twice', async () => {
    const { service, prisma, tx, rewardLedgerService, rewardAuditService } =
      createService();

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Demo User',
      email: 'user@example.com',
    });
    prisma.badgeDefinition.findUnique.mockResolvedValue(buildBadge());
    tx.userBadge.findUnique.mockResolvedValue({
      id: 'user-badge-1',
      status: UserBadgeStatus.EARNED,
    });

    const result = await service.assignBadgeToUser({
      userId: 'user-1',
      badgeCode: 'FOUNDING_MEMBER',
      adminId: 'admin-1',
      reason: 'Launch cohort',
    });

    expect(result.data!.alreadyAssigned).toBe(true);
    expect(rewardLedgerService.writeBadgeEvent).not.toHaveBeenCalled();
    expect(rewardAuditService.recordSuccess).not.toHaveBeenCalled();
  });

  it('revokes an assigned badge without deleting the UserBadge row and audits the revoke', async () => {
    const {
      service,
      prisma,
      tx,
      badgeRewardImpactService,
      rewardAuditService,
      rewardLedgerService,
      userRewardProfileService,
    } = createService();

    prisma.badgeDefinition.findUnique.mockResolvedValue(buildBadge());
    tx.userBadge.findUnique.mockResolvedValue({
      id: 'user-badge-1',
      status: UserBadgeStatus.EARNED,
      metadata: null,
      deactivatedAt: null,
    });
    tx.userBadge.update.mockResolvedValue({
      id: 'user-badge-1',
      status: UserBadgeStatus.REVOKED,
      earnedAt: new Date('2026-07-01T00:00:00.000Z'),
      activatedAt: null,
      deactivatedAt: null,
      revokedAt: new Date('2026-07-02T00:00:00.000Z'),
    });
    badgeRewardImpactService.deactivateBadgeRewardBenefit.mockResolvedValue(
      undefined,
    );
    rewardLedgerService.writeBadgeEvent.mockResolvedValue({});
    userRewardProfileService.syncBadgeAndRewardCounts.mockResolvedValue({});

    const result = await service.revokeBadgeFromUser({
      userId: 'user-1',
      badgeCode: 'FOUNDING_MEMBER',
      adminId: 'admin-1',
      reason: 'Manual revoke',
    });

    expect(result.data!.alreadyRevoked).toBe(false);
    expect(tx.userBadge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: UserBadgeStatus.REVOKED,
        }),
      }),
    );
    expect(
      badgeRewardImpactService.deactivateBadgeRewardBenefit,
    ).toHaveBeenCalled();
    expect(rewardAuditService.recordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.BADGE_MANUALLY_REVOKED,
      }),
    );
  });

  it('uses the hall of fame audit action for hall of fame manual assignment', async () => {
    const {
      service,
      prisma,
      tx,
      rewardAuditService,
      rewardLedgerService,
      badgeRewardImpactService,
      userRewardProfileService,
    } = createService();

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Demo User',
      email: 'user@example.com',
    });
    prisma.badgeDefinition.findUnique.mockResolvedValue(
      buildBadge({
        code: 'HALL_OF_FAME_2026',
        category: BadgeCategory.HALL_OF_FAME,
        triggerType: BadgeTriggerType.MANUAL,
      }),
    );
    tx.userBadge.findUnique.mockResolvedValue(null);
    tx.userBadge.upsert.mockResolvedValue({
      id: 'user-badge-2',
      status: UserBadgeStatus.EARNED,
      earnedAt: new Date('2026-07-01T00:00:00.000Z'),
      activatedAt: null,
      deactivatedAt: null,
      revokedAt: null,
    });
    rewardLedgerService.writeBadgeEvent.mockResolvedValue({});
    badgeRewardImpactService.syncBadgeRewardBenefit.mockResolvedValue(undefined);
    userRewardProfileService.syncBadgeAndRewardCounts.mockResolvedValue({});

    await service.assignBadgeToUser({
      userId: 'user-1',
      badgeCode: 'HALL_OF_FAME_2026',
      adminId: 'admin-1',
      reason: 'Annual recognition',
    });

    expect(rewardAuditService.recordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        action: REWARD_AUDIT_ACTIONS.HALL_OF_FAME_BADGE_ASSIGNED,
      }),
    );
  });

  it('blocks marketplace performance badge assignment without override', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Demo User',
      email: 'user@example.com',
    });
    prisma.badgeDefinition.findUnique.mockResolvedValue(
      buildBadge({
        code: 'HIGH_APPROVAL',
        category: BadgeCategory.MARKETPLACE,
        triggerType: BadgeTriggerType.APPROVAL_RATE,
        isPersistent: false,
      }),
    );

    await expect(
      service.assignBadgeToUser({
        userId: 'user-1',
        badgeCode: 'HIGH_APPROVAL',
        adminId: 'admin-1',
        reason: 'Needs manual force',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows marketplace performance badge assignment when override is true', async () => {
    const {
      service,
      prisma,
      tx,
      rewardLedgerService,
      badgeRewardImpactService,
      userRewardProfileService,
    } = createService();

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Demo User',
      email: 'user@example.com',
    });
    prisma.badgeDefinition.findUnique.mockResolvedValue(
      buildBadge({
        code: 'HIGH_APPROVAL',
        category: BadgeCategory.MARKETPLACE,
        triggerType: BadgeTriggerType.APPROVAL_RATE,
        isPersistent: false,
        rewardType: BadgeRewardType.VISIBILITY_BOOST,
      }),
    );
    tx.userBadge.findUnique.mockResolvedValue(null);
    tx.userBadge.upsert.mockResolvedValue({
      id: 'user-badge-1',
      status: UserBadgeStatus.ACTIVE,
      earnedAt: null,
      activatedAt: new Date('2026-07-01T00:00:00.000Z'),
      deactivatedAt: null,
      revokedAt: null,
    });
    rewardLedgerService.writeBadgeEvent.mockResolvedValue({});
    badgeRewardImpactService.syncBadgeRewardBenefit.mockResolvedValue(undefined);
    userRewardProfileService.syncBadgeAndRewardCounts.mockResolvedValue({});

    const result = await service.assignBadgeToUser({
      userId: 'user-1',
      badgeCode: 'HIGH_APPROVAL',
      adminId: 'admin-1',
      reason: 'Exceptional manual override',
      overridePerformanceBadge: true,
    });

    expect(result.data!.alreadyAssigned).toBe(false);
    expect(tx.userBadge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: UserBadgeStatus.ACTIVE,
        }),
      }),
    );
  });

  it('getAdminUserRewardDetail counts only earned or active kickstarter and hall of fame badges', async () => {
    const {
      service,
      prisma,
      badgeRuleEvaluatorService,
      rewardLedgerService,
      userRewardProfileService,
    } = createService();

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Demo User',
      email: 'user@example.com',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      isVerified: true,
    });
    userRewardProfileService.getOrCreateProfile.mockResolvedValue({ id: 'profile-1' });
    prisma.userBadge.findMany.mockResolvedValue([
      {
        id: 'ub-1',
        badgeId: 'kick-earned',
        userId: 'user-1',
        status: UserBadgeStatus.EARNED,
        badge: buildBadge({ id: 'kick-earned', code: 'FOUNDING_MEMBER' }),
        metadata: null,
        earnedAt: new Date(),
        activatedAt: null,
        deactivatedAt: null,
        revokedAt: null,
        expiresAt: null,
        updatedAt: new Date(),
      },
      {
        id: 'ub-2',
        badgeId: 'hof-locked',
        userId: 'user-1',
        status: UserBadgeStatus.LOCKED,
        badge: buildBadge({
          id: 'hof-locked',
          code: 'HALL_OF_FAME_2026',
          category: BadgeCategory.HALL_OF_FAME,
        }),
        metadata: null,
        earnedAt: null,
        activatedAt: null,
        deactivatedAt: null,
        revokedAt: null,
        expiresAt: null,
        updatedAt: new Date(),
      },
      {
        id: 'ub-3',
        badgeId: 'active-market',
        userId: 'user-1',
        status: UserBadgeStatus.ACTIVE,
        badge: buildBadge({
          id: 'active-market',
          code: 'HIGH_APPROVAL',
          category: BadgeCategory.MARKETPLACE,
        }),
        metadata: null,
        earnedAt: null,
        activatedAt: new Date(),
        deactivatedAt: null,
        revokedAt: null,
        expiresAt: null,
        updatedAt: new Date(),
      },
      {
        id: 'ub-4',
        badgeId: 'inactive-market',
        userId: 'user-1',
        status: UserBadgeStatus.INACTIVE,
        badge: buildBadge({
          id: 'inactive-market',
          code: 'TRUSTED_PARTNER',
          category: BadgeCategory.MARKETPLACE,
        }),
        metadata: null,
        earnedAt: null,
        activatedAt: null,
        deactivatedAt: new Date(),
        revokedAt: null,
        expiresAt: null,
        updatedAt: new Date(),
      },
      {
        id: 'ub-5',
        badgeId: 'revoked-market',
        userId: 'user-1',
        status: UserBadgeStatus.REVOKED,
        badge: buildBadge({
          id: 'revoked-market',
          code: 'TOP_CONTRIBUTOR',
          category: BadgeCategory.MARKETPLACE,
        }),
        metadata: null,
        earnedAt: null,
        activatedAt: null,
        deactivatedAt: null,
        revokedAt: new Date(),
        expiresAt: null,
        updatedAt: new Date(),
      },
    ]);
    prisma.userRewardBenefit.findMany.mockResolvedValue([
      { id: 'benefit-1', status: RewardBenefitStatus.ACTIVE },
    ]);
    prisma.rewardLedger.findMany.mockResolvedValue([]);
    rewardLedgerService.getUserLedgerSummaryData.mockResolvedValue({ total: 0 });
    prisma.badgeDefinition.findMany.mockResolvedValue([
      buildBadge({ id: 'kick-earned', code: 'FOUNDING_MEMBER' }),
      buildBadge({
        id: 'hof-locked',
        code: 'HALL_OF_FAME_2026',
        category: BadgeCategory.HALL_OF_FAME,
      }),
      buildBadge({
        id: 'active-market',
        code: 'HIGH_APPROVAL',
        category: BadgeCategory.MARKETPLACE,
      }),
      buildBadge({
        id: 'inactive-market',
        code: 'TRUSTED_PARTNER',
        category: BadgeCategory.MARKETPLACE,
      }),
      buildBadge({
        id: 'revoked-market',
        code: 'TOP_CONTRIBUTOR',
        category: BadgeCategory.MARKETPLACE,
      }),
    ]);
    badgeRuleEvaluatorService.evaluate.mockReturnValue({
      qualifies: false,
      eligible: false,
      status: 'LOCKED',
      progress: {},
      reason: 'test',
    });

    const result = await service.getAdminUserRewardDetail('user-1');

    expect(result.data!.summary).toEqual(
      expect.objectContaining({
        earnedBadgeCount: 2,
        activeBadgeCount: 1,
        inactiveBadgeCount: 1,
        revokedBadgeCount: 1,
        kickstarterBadgeCount: 1,
        hallOfFameBadgeCount: 0,
        activeRewardCount: 1,
      }),
    );
  });
});
