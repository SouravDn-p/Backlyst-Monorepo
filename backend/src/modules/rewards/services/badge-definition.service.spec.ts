import {
  BadgeCategory,
  BadgeRoleScope,
  UserBadgeStatus,
} from '@prisma/client';
import { BadgeDefinitionService } from './badge-definition.service';

describe('BadgeDefinitionService', () => {
  function createService() {
    const prisma = {
      user: { findUnique: jest.fn() },
      badgeDefinition: { findMany: jest.fn() },
      userBadge: { findMany: jest.fn() },
    };

    const userRewardProfileService = {
      getOrCreateProfile: jest.fn(),
    };

    const badgeRuleEvaluatorService = {
      evaluate: jest.fn(),
    };

    const rewardAuditService = {
      recordSuccess: jest.fn(),
    };

    const service = new BadgeDefinitionService(
      prisma as any,
      userRewardProfileService as any,
      badgeRuleEvaluatorService as any,
      rewardAuditService as any,
    );

    return {
      service,
      prisma,
      userRewardProfileService,
      badgeRuleEvaluatorService,
      rewardAuditService,
    };
  }

  it('groups kickstarter, hall of fame, revoked, and inactive-history badges correctly', async () => {
    const {
      service,
      prisma,
      userRewardProfileService,
      badgeRuleEvaluatorService,
    } = createService();

    userRewardProfileService.getOrCreateProfile.mockResolvedValue({});
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isVerified: true });
    prisma.badgeDefinition.findMany.mockResolvedValue([
      {
        id: 'badge-kick',
        code: 'FOUNDING_MEMBER',
        name: 'Founding Member',
        category: BadgeCategory.KICKSTARTER,
        roleScope: BadgeRoleScope.ANY,
        isPersistent: true,
        isActive: true,
        requirementText: null,
        rewardImpactText: null,
      },
      {
        id: 'badge-hof',
        code: 'APPROVED_TASKS_100',
        name: '100 Approved Tasks',
        category: BadgeCategory.HALL_OF_FAME,
        roleScope: BadgeRoleScope.ANY,
        isPersistent: true,
        isActive: true,
        requirementText: null,
        rewardImpactText: null,
      },
      {
        id: 'badge-revoked',
        code: 'HIGH_APPROVAL',
        name: 'High Approval',
        category: BadgeCategory.MARKETPLACE,
        roleScope: BadgeRoleScope.PROVIDER,
        isPersistent: false,
        isActive: true,
        requirementText: null,
        rewardImpactText: null,
      },
      {
        id: 'badge-inactive',
        code: 'LEGACY_BADGE',
        name: 'Legacy Badge',
        category: BadgeCategory.MARKETPLACE,
        roleScope: BadgeRoleScope.ANY,
        isPersistent: false,
        isActive: false,
        requirementText: null,
        rewardImpactText: null,
      },
    ]);
    prisma.userBadge.findMany.mockResolvedValue([
      {
        badgeId: 'badge-kick',
        status: UserBadgeStatus.EARNED,
        metadata: null,
        earnedAt: new Date('2026-06-01T00:00:00.000Z'),
        activatedAt: null,
        expiresAt: null,
        revokedAt: null,
      },
      {
        badgeId: 'badge-hof',
        status: UserBadgeStatus.EARNED,
        metadata: null,
        earnedAt: new Date('2026-06-02T00:00:00.000Z'),
        activatedAt: null,
        expiresAt: null,
        revokedAt: null,
      },
      {
        badgeId: 'badge-revoked',
        status: UserBadgeStatus.REVOKED,
        metadata: null,
        earnedAt: null,
        activatedAt: null,
        expiresAt: null,
        revokedAt: new Date('2026-06-03T00:00:00.000Z'),
      },
      {
        badgeId: 'badge-inactive',
        status: UserBadgeStatus.INACTIVE,
        metadata: null,
        earnedAt: null,
        activatedAt: null,
        expiresAt: null,
        revokedAt: null,
      },
    ]);
    badgeRuleEvaluatorService.evaluate.mockReturnValue({
      qualifies: false,
      eligible: false,
      status: 'LOCKED',
      progress: {},
      reason: 'No-op',
    });

    const result = await service.getMyBadgesData('user-1');

    expect(result.kickstarter).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'FOUNDING_MEMBER' })]),
    );
    expect(result.hallOfFame).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'APPROVED_TASKS_100' }),
      ]),
    );
    expect(result.revoked).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'HIGH_APPROVAL' })]),
    );
    expect(result.inactive).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'LEGACY_BADGE' })]),
    );
  });
});
