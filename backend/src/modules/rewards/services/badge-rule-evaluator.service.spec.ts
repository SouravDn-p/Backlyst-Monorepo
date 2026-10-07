import {
  BadgeCategory,
  BadgeRewardType,
  BadgeRoleScope,
  BadgeScope,
  BadgeTriggerType,
} from '@prisma/client';
import { BadgeRuleEvaluatorService } from './badge-rule-evaluator.service';

describe('BadgeRuleEvaluatorService', () => {
  const service = new BadgeRuleEvaluatorService();

  function definition(overrides: Record<string, unknown> = {}) {
    return {
      id: 'badge-1',
      code: 'HIGH_APPROVAL',
      name: 'High Approval',
      description: null,
      category: BadgeCategory.MARKETPLACE,
      requirementText: null,
      rewardImpactText: null,
      badgeScope: BadgeScope.PROVIDER_PROFILE,
      roleScope: BadgeRoleScope.PROVIDER,
      triggerType: BadgeTriggerType.APPROVAL_RATE,
      threshold: 90,
      secondaryThreshold: 10,
      isPersistent: false,
      isActive: true,
      rewardType: BadgeRewardType.VISIBILITY_BOOST,
      rewardValue: null,
      rewardMeta: null,
      validityDays: 90,
      refreshWindowDays: 7,
      gracePeriodDays: 14,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function profile(overrides: Record<string, unknown> = {}) {
    return {
      id: 'profile-1',
      userId: 'user-1',
      totalApprovedTasks: 0,
      providerApprovedTasks: 0,
      requesterCompletedTasks: 0,
      providerReviewedTasks: 0,
      providerApprovalRate: 0,
      providerDisputeRate: 0,
      providerRevisionRate: 0,
      providerResponseRate24h: 0,
      providerFastResponseCount: 0,
      providerResponseOpportunityCount: 0,
      requesterReviewRate72h: 0,
      requesterFastReviewCount: 0,
      requesterReviewOpportunityCount: 0,
      requesterDisputeRate: 0,
      currentStreakCount: 0,
      bestStreakCount: 0,
      milestoneTaskCount: 0,
      nextMilestoneAt: 10,
      uniqueRequesterCount: 0,
      uniqueProviderCount: 0,
      uniqueDomainCount: 0,
      earnedBadgeCount: 0,
      activeRewardCount: 0,
      lastRewardEvaluatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  it('HIGH_APPROVAL does not deactivate at 88%', () => {
    const result = service.evaluate(
      definition({ code: 'HIGH_APPROVAL' }),
      profile({ providerReviewedTasks: 12, providerApprovalRate: 88 }),
      { currentStatus: 'ACTIVE' },
    );

    expect(result.status).toBe('ELIGIBLE');
    expect(result.qualifies).toBe(false);
  });

  it('HIGH_APPROVAL deactivates below 85%', () => {
    const result = service.evaluate(
      definition({ code: 'HIGH_APPROVAL' }),
      profile({ providerReviewedTasks: 12, providerApprovalRate: 84 }),
      { currentStatus: 'ACTIVE' },
    );

    expect(result.status).toBe('INACTIVE');
  });

  it('TOP_CONTRIBUTOR deactivates only when approval < 85 or dispute > 8', () => {
    const topContributor = definition({
      code: 'TOP_CONTRIBUTOR',
      triggerType: BadgeTriggerType.VERIFIED_TASK_COUNT,
      rewardType: BadgeRewardType.PRIORITY_BOOST,
      threshold: 20,
      secondaryThreshold: 90,
    });

    const safeResult = service.evaluate(
      topContributor,
      profile({
        providerApprovedTasks: 25,
        providerApprovalRate: 86,
        providerDisputeRate: 7,
        uniqueRequesterCount: 5,
      }),
      { currentStatus: 'ACTIVE' },
    );
    const approvalDropResult = service.evaluate(
      topContributor,
      profile({
        providerApprovedTasks: 25,
        providerApprovalRate: 84,
        providerDisputeRate: 4,
        uniqueRequesterCount: 5,
      }),
      { currentStatus: 'ACTIVE' },
    );
    const disputeRiseResult = service.evaluate(
      topContributor,
      profile({
        providerApprovedTasks: 25,
        providerApprovalRate: 91,
        providerDisputeRate: 9,
        uniqueRequesterCount: 5,
      }),
      { currentStatus: 'ACTIVE' },
    );

    expect(safeResult.status).toBe('ELIGIBLE');
    expect(approvalDropResult.status).toBe('INACTIVE');
    expect(disputeRiseResult.status).toBe('INACTIVE');
  });

  it('TRUSTED_PARTNER deactivates only when approval < 90 or dispute > 5', () => {
    const trustedPartner = definition({
      code: 'TRUSTED_PARTNER',
      triggerType: BadgeTriggerType.LOW_DISPUTE,
      rewardType: BadgeRewardType.SUPPORT_PRIORITY,
      threshold: 50,
      secondaryThreshold: 95,
    });

    const safeResult = service.evaluate(
      trustedPartner,
      profile({
        providerApprovedTasks: 55,
        providerApprovalRate: 92,
        providerDisputeRate: 3,
        providerRevisionRate: 14,
      }),
      { currentStatus: 'ACTIVE' },
    );
    const approvalDropResult = service.evaluate(
      trustedPartner,
      profile({
        providerApprovedTasks: 55,
        providerApprovalRate: 89,
        providerDisputeRate: 2,
        providerRevisionRate: 10,
      }),
      { currentStatus: 'ACTIVE' },
    );
    const disputeRiseResult = service.evaluate(
      trustedPartner,
      profile({
        providerApprovedTasks: 55,
        providerApprovalRate: 95,
        providerDisputeRate: 6,
        providerRevisionRate: 10,
      }),
      { currentStatus: 'ACTIVE' },
    );

    expect(safeResult.status).toBe('ELIGIBLE');
    expect(approvalDropResult.status).toBe('INACTIVE');
    expect(disputeRiseResult.status).toBe('INACTIVE');
  });
});
