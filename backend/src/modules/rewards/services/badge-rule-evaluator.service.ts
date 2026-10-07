import { Injectable } from '@nestjs/common';
import {
  BadgeDefinition,
  BadgeTriggerType,
  UserBadgeStatus,
  UserRewardProfile,
} from '@prisma/client';

export type BadgeEvaluationResult = {
  qualifies: boolean;
  eligible: boolean;
  status: 'LOCKED' | 'ELIGIBLE' | 'EARNED' | 'ACTIVE' | 'INACTIVE';
  progress: Record<string, unknown>;
  reason: string;
  rewardMetadata?: Record<string, unknown>;
};

type EvaluateContext = {
  userIsVerified?: boolean;
  currentStatus?: UserBadgeStatus;
};

@Injectable()
export class BadgeRuleEvaluatorService {
  evaluate(
    definition: BadgeDefinition,
    profile: UserRewardProfile,
    context?: EvaluateContext,
  ): BadgeEvaluationResult {
    switch (definition.code) {
      case 'VERIFIED':
        return this.evaluateVerified(context?.userIsVerified);
      case 'FIRST_SUCCESS':
        return this.evaluatePermanentThreshold(
          profile.totalApprovedTasks,
          1,
          'Complete the first approved marketplace task.',
        );
      case 'FAST_RESPONDER':
        return this.evaluateFastResponder(definition, profile, context);
      case 'HIGH_APPROVAL':
        return this.evaluateHighApproval(definition, profile, context);
      case 'TOP_CONTRIBUTOR':
        return this.evaluateTopContributor(definition, profile, context);
      case 'TRUSTED_PARTNER':
        return this.evaluateTrustedPartner(definition, profile, context);
      case 'CONSISTENT_CONTRIBUTOR':
        return this.evaluateConsistentContributor(definition, profile, context);
      case 'LOW_DISPUTE_PROVIDER':
        return this.evaluateLowDisputeProvider(definition, profile, context);
      case 'RELIABLE_REQUESTER':
        return this.evaluateReliableRequester(definition, profile, context);
      case 'FAST_REVIEWER':
        return this.evaluateFastReviewer(definition, profile, context);
      case 'APPROVED_TASKS_100':
        return this.evaluatePermanentThreshold(
          profile.totalApprovedTasks,
          100,
          'Reach 100 approved completed tasks.',
        );
      case 'APPROVED_TASKS_500':
        return this.evaluatePermanentThreshold(
          profile.totalApprovedTasks,
          500,
          'Reach 500 approved completed tasks.',
        );
      default:
        if (definition.triggerType === BadgeTriggerType.KICKSTARTER_TIER) {
          return {
            qualifies: false,
            eligible: false,
            status: 'LOCKED',
            progress: {},
            reason: 'Kickstarter badges are not auto-assigned in Phase 3.',
          };
        }

        return {
          qualifies: false,
          eligible: false,
          status: 'LOCKED',
          progress: {},
          reason: 'Badge rule is not auto-evaluated in this phase.',
        };
    }
  }

  private evaluateVerified(userIsVerified?: boolean): BadgeEvaluationResult {
    if (userIsVerified) {
      return {
        qualifies: true,
        eligible: true,
        status: 'EARNED',
        progress: { verified: true },
        reason: 'User account is verified.',
      };
    }

    return {
      qualifies: false,
      eligible: false,
      status: 'LOCKED',
      progress: { verified: false },
      reason: 'User verification has not been completed yet.',
    };
  }

  private evaluatePermanentThreshold(
    value: number,
    threshold: number,
    reason: string,
  ): BadgeEvaluationResult {
    const qualifies = value >= threshold;
    return {
      qualifies,
      eligible: value > 0 && !qualifies,
      status: qualifies ? 'EARNED' : value > 0 ? 'ELIGIBLE' : 'LOCKED',
      progress: { current: value, threshold },
      reason: qualifies ? reason : `Progress ${value}/${threshold}.`,
    };
  }

  private evaluateFastResponder(
    definition: BadgeDefinition,
    profile: UserRewardProfile,
    context?: EvaluateContext,
  ): BadgeEvaluationResult {
    const minRate = definition.threshold ?? 80;
    const minOpportunities = definition.secondaryThreshold ?? 5;
    const deactivateBelowRate = 70;
    const currentRate = profile.providerResponseRate24h;
    const opportunities = profile.providerResponseOpportunityCount;
    const qualifies = opportunities >= minOpportunities && currentRate >= minRate;

    if (qualifies) {
      return {
        qualifies: true,
        eligible: true,
        status: 'ACTIVE',
        progress: { currentRate, opportunities, minRate, minOpportunities },
        reason: 'Provider response rate meets the fast responder threshold.',
      };
    }

    if (
      context?.currentStatus === UserBadgeStatus.ACTIVE &&
      opportunities >= minOpportunities &&
      currentRate < deactivateBelowRate
    ) {
      return {
        qualifies: false,
        eligible: true,
        status: 'INACTIVE',
        progress: {
          currentRate,
          opportunities,
          minRate,
          minOpportunities,
          deactivateBelowRate,
        },
        reason: 'Provider response rate fell below the deactivation floor.',
      };
    }

    if (opportunities > 0) {
      return {
        qualifies: false,
        eligible: true,
        status: 'ELIGIBLE',
        progress: {
          currentRate,
          opportunities,
          minRate,
          minOpportunities,
          deactivateBelowRate,
        },
        reason: 'Provider has partial response activity but has not reached the badge threshold yet.',
      };
    }

    return {
      qualifies: false,
      eligible: false,
      status: 'LOCKED',
      progress: {
        currentRate,
        opportunities,
        minRate,
        minOpportunities,
        deactivateBelowRate,
      },
      reason: 'Provider response opportunity tracking is not available yet.',
    };
  }

  private evaluateHighApproval(
    definition: BadgeDefinition,
    profile: UserRewardProfile,
    context?: EvaluateContext,
  ): BadgeEvaluationResult {
    const minRate = definition.threshold ?? 90;
    const minReviewed = definition.secondaryThreshold ?? 10;
    const deactivateBelowRate = 85;
    const reviewed = profile.providerReviewedTasks;
    const approvalRate = profile.providerApprovalRate;
    const qualifies = reviewed >= minReviewed && approvalRate >= minRate;

    if (qualifies) {
      return {
        qualifies: true,
        eligible: true,
        status: 'ACTIVE',
        progress: {
          reviewed,
          approvalRate,
          minRate,
          minReviewed,
          deactivateBelowRate,
        },
        reason: 'Provider approval rate meets the high approval threshold.',
      };
    }

    if (
      context?.currentStatus === UserBadgeStatus.ACTIVE &&
      reviewed >= minReviewed &&
      approvalRate < deactivateBelowRate
    ) {
      return {
        qualifies: false,
        eligible: true,
        status: 'INACTIVE',
        progress: {
          reviewed,
          approvalRate,
          minRate,
          minReviewed,
          deactivateBelowRate,
        },
        reason: 'Provider approval rate fell below the deactivation floor.',
      };
    }

    if (reviewed > 0) {
      return {
        qualifies: false,
        eligible: true,
        status: 'ELIGIBLE',
        progress: {
          reviewed,
          approvalRate,
          minRate,
          minReviewed,
          deactivateBelowRate,
        },
        reason: 'Provider has reviewed tasks but has not reached the required quality threshold yet.',
      };
    }

    return {
      qualifies: false,
      eligible: false,
      status: 'LOCKED',
      progress: {
        reviewed,
        approvalRate,
        minRate,
        minReviewed,
        deactivateBelowRate,
      },
      reason: 'Provider does not have enough reviewed tasks for this badge yet.',
    };
  }

  private evaluateTopContributor(
    definition: BadgeDefinition,
    profile: UserRewardProfile,
    context?: EvaluateContext,
  ): BadgeEvaluationResult {
    const approvedTasks = profile.providerApprovedTasks;
    const approvalRate = profile.providerApprovalRate;
    const disputeRate = profile.providerDisputeRate;
    const uniqueRequesterCount = profile.uniqueRequesterCount;
    const uniqueDomainCount = profile.uniqueDomainCount;
    const uniqueReach = Math.max(uniqueRequesterCount, uniqueDomainCount);
    const responseOpportunities = profile.providerResponseOpportunityCount;
    const responseRate = profile.providerResponseRate24h;
    const responseGateAvailable = responseOpportunities >= 5;
    const responsePass = !responseGateAvailable || responseRate >= 75;
    const deactivateBelowApproval = 85;
    const deactivateAboveDispute = 8;
    const qualifies =
      approvedTasks >= (definition.threshold ?? 20) &&
      approvalRate >= (definition.secondaryThreshold ?? 90) &&
      disputeRate <= 5 &&
      uniqueReach >= 5 &&
      responsePass;

    const progress = {
      approvedTasks,
      approvalRate,
      disputeRate,
      uniqueRequesterCount,
      uniqueDomainCount,
      providerResponseRate24h: responseRate,
      providerResponseOpportunityCount: responseOpportunities,
      deactivateBelowApproval,
      deactivateAboveDispute,
    };

    if (qualifies) {
      return {
        qualifies: true,
        eligible: true,
        status: 'ACTIVE',
        progress,
        reason: 'Provider meets the top contributor requirements.',
      };
    }

    const hasRealNegativeSignal =
      context?.currentStatus === UserBadgeStatus.ACTIVE &&
      approvedTasks >= (definition.threshold ?? 20) &&
      (approvalRate < deactivateBelowApproval ||
        disputeRate > deactivateAboveDispute);

    if (hasRealNegativeSignal) {
      return {
        qualifies: false,
        eligible: true,
        status: 'INACTIVE',
        progress,
        reason: 'Provider quality signals no longer meet top contributor standards.',
      };
    }

    return {
      qualifies: false,
      eligible: approvedTasks > 0,
      status: approvedTasks > 0 ? 'ELIGIBLE' : 'LOCKED',
      progress,
      reason:
        approvedTasks > 0
          ? 'Provider has partial contribution progress but has not met the full badge criteria yet.'
          : 'Provider has not reached enough approved tasks for this badge yet.',
    };
  }

  private evaluateTrustedPartner(
    definition: BadgeDefinition,
    profile: UserRewardProfile,
    context?: EvaluateContext,
  ): BadgeEvaluationResult {
    const approvedTasks = profile.providerApprovedTasks;
    const approvalRate = profile.providerApprovalRate;
    const disputeRate = profile.providerDisputeRate;
    const revisionRate = profile.providerRevisionRate;
    const deactivateBelowApproval = 90;
    const deactivateAboveDispute = 5;
    const qualifies =
      approvedTasks >= (definition.threshold ?? 50) &&
      approvalRate >= (definition.secondaryThreshold ?? 95) &&
      disputeRate <= 2 &&
      revisionRate <= 15;

    const baseProgress = {
      approvedTasks,
      approvalRate,
      disputeRate,
      revisionRate,
      deactivateBelowApproval,
      deactivateAboveDispute,
      seriousDisputeSource: 'not_available_in_phase_3',
    };

    if (qualifies) {
      return {
        qualifies: true,
        eligible: true,
        status: 'ACTIVE',
        progress: baseProgress,
        reason: 'Provider meets the trusted partner quality thresholds.',
      };
    }

    if (
      context?.currentStatus === UserBadgeStatus.ACTIVE &&
      approvedTasks >= (definition.threshold ?? 50) &&
      (approvalRate < deactivateBelowApproval ||
        disputeRate > deactivateAboveDispute)
    ) {
      return {
        qualifies: false,
        eligible: true,
        status: 'INACTIVE',
        progress: baseProgress,
        reason: 'Provider no longer meets the trusted partner quality thresholds.',
      };
    }

    return {
      qualifies: false,
      eligible: approvedTasks > 0,
      status: approvedTasks > 0 ? 'ELIGIBLE' : 'LOCKED',
      progress: baseProgress,
      reason:
        approvedTasks > 0
          ? 'Provider has progress toward trusted partner but has not reached the thresholds yet.'
          : 'Provider has not reached enough approved tasks for this badge yet.',
    };
  }

  private evaluateConsistentContributor(
    definition: BadgeDefinition,
    profile: UserRewardProfile,
    context?: EvaluateContext,
  ): BadgeEvaluationResult {
    const currentStreak = profile.currentStreakCount;
    const qualifies = currentStreak >= (definition.threshold ?? 3);

    if (qualifies) {
      return {
        qualifies: true,
        eligible: true,
        status: 'ACTIVE',
        progress: {
          currentStreak,
          bestStreak: profile.bestStreakCount,
          threshold: definition.threshold ?? 3,
        },
        reason: 'Provider streak meets the consistency threshold.',
      };
    }

    if (context?.currentStatus === UserBadgeStatus.ACTIVE && currentStreak === 0) {
      return {
        qualifies: false,
        eligible: true,
        status: 'INACTIVE',
        progress: {
          currentStreak,
          bestStreak: profile.bestStreakCount,
          threshold: definition.threshold ?? 3,
        },
        reason: 'Provider streak has been broken.',
      };
    }

    return {
      qualifies: false,
      eligible: currentStreak > 0,
      status: currentStreak > 0 ? 'ELIGIBLE' : 'LOCKED',
      progress: {
        currentStreak,
        bestStreak: profile.bestStreakCount,
        threshold: definition.threshold ?? 3,
      },
      reason:
        currentStreak > 0
          ? 'Provider has streak progress but has not met the active threshold yet.'
          : 'Provider has no active streak yet.',
    };
  }

  private evaluateLowDisputeProvider(
    definition: BadgeDefinition,
    profile: UserRewardProfile,
    context?: EvaluateContext,
  ): BadgeEvaluationResult {
    const approvedTasks = profile.providerApprovedTasks;
    const disputeRate = profile.providerDisputeRate;
    const minApproved = definition.threshold ?? 10;
    const maxDisputeRate = definition.secondaryThreshold ?? 5;
    const qualifies = approvedTasks >= minApproved && disputeRate <= maxDisputeRate;

    if (qualifies) {
      return {
        qualifies: true,
        eligible: true,
        status: 'ACTIVE',
        progress: { approvedTasks, disputeRate, minApproved, maxDisputeRate },
        reason: 'Provider dispute rate is within the trusted threshold.',
      };
    }

    if (
      context?.currentStatus === UserBadgeStatus.ACTIVE &&
      approvedTasks >= minApproved &&
      disputeRate > maxDisputeRate
    ) {
      return {
        qualifies: false,
        eligible: true,
        status: 'INACTIVE',
        progress: { approvedTasks, disputeRate, minApproved, maxDisputeRate },
        reason: 'Provider dispute rate is above the active threshold.',
      };
    }

    return {
      qualifies: false,
      eligible: approvedTasks > 0,
      status: approvedTasks > 0 ? 'ELIGIBLE' : 'LOCKED',
      progress: { approvedTasks, disputeRate, minApproved, maxDisputeRate },
      reason:
        approvedTasks > 0
          ? 'Provider has partial dispute-quality progress but has not met the full criteria yet.'
          : 'Provider has not reached enough approved tasks for this badge yet.',
    };
  }

  private evaluateReliableRequester(
    definition: BadgeDefinition,
    profile: UserRewardProfile,
    context?: EvaluateContext,
  ): BadgeEvaluationResult {
    const completedTasks = profile.requesterCompletedTasks;
    const disputeRate = profile.requesterDisputeRate;
    const reviewGateAvailable = profile.requesterReviewOpportunityCount >= 5;
    const reviewPass = !reviewGateAvailable || profile.requesterReviewRate72h >= 80;
    const qualifies =
      completedTasks >= (definition.threshold ?? 10) &&
      disputeRate <= 5 &&
      reviewPass;

    if (qualifies) {
      return {
        qualifies: true,
        eligible: true,
        status: 'ACTIVE',
        progress: {
          completedTasks,
          disputeRate,
          requesterReviewRate72h: profile.requesterReviewRate72h,
          requesterReviewOpportunityCount: profile.requesterReviewOpportunityCount,
        },
        reason: 'Requester meets the reliable requester quality thresholds.',
      };
    }

    if (
      context?.currentStatus === UserBadgeStatus.ACTIVE &&
      completedTasks >= (definition.threshold ?? 10) &&
      (disputeRate > 5 || (reviewGateAvailable && profile.requesterReviewRate72h < 80))
    ) {
      return {
        qualifies: false,
        eligible: true,
        status: 'INACTIVE',
        progress: {
          completedTasks,
          disputeRate,
          requesterReviewRate72h: profile.requesterReviewRate72h,
          requesterReviewOpportunityCount: profile.requesterReviewOpportunityCount,
        },
        reason: 'Requester no longer meets the reliable requester thresholds.',
      };
    }

    return {
      qualifies: false,
      eligible: completedTasks > 0,
      status: completedTasks > 0 ? 'ELIGIBLE' : 'LOCKED',
      progress: {
        completedTasks,
        disputeRate,
        requesterReviewRate72h: profile.requesterReviewRate72h,
        requesterReviewOpportunityCount: profile.requesterReviewOpportunityCount,
      },
      reason:
        completedTasks > 0
          ? 'Requester has progress but has not yet met the reliable requester thresholds.'
          : 'Requester has not completed enough approved tasks for this badge yet.',
    };
  }

  private evaluateFastReviewer(
    definition: BadgeDefinition,
    profile: UserRewardProfile,
    context?: EvaluateContext,
  ): BadgeEvaluationResult {
    const minRate = definition.threshold ?? 80;
    const minOpportunities = definition.secondaryThreshold ?? 5;
    const deactivateBelowRate = 70;
    const rate = profile.requesterReviewRate72h;
    const opportunities = profile.requesterReviewOpportunityCount;
    const qualifies = opportunities >= minOpportunities && rate >= minRate;

    if (qualifies) {
      return {
        qualifies: true,
        eligible: true,
        status: 'ACTIVE',
        progress: { rate, opportunities, minRate, minOpportunities },
        reason: 'Requester review speed meets the fast reviewer threshold.',
      };
    }

    if (
      context?.currentStatus === UserBadgeStatus.ACTIVE &&
      opportunities >= minOpportunities &&
      rate < deactivateBelowRate
    ) {
      return {
        qualifies: false,
        eligible: true,
        status: 'INACTIVE',
        progress: {
          rate,
          opportunities,
          minRate,
          minOpportunities,
          deactivateBelowRate,
        },
        reason: 'Requester review speed fell below the deactivation floor.',
      };
    }

    if (opportunities > 0) {
      return {
        qualifies: false,
        eligible: true,
        status: 'ELIGIBLE',
        progress: {
          rate,
          opportunities,
          minRate,
          minOpportunities,
          deactivateBelowRate,
        },
        reason: 'Requester has partial review activity but has not met the badge threshold yet.',
      };
    }

    return {
      qualifies: false,
      eligible: false,
      status: 'LOCKED',
      progress: {
        rate,
        opportunities,
        minRate,
        minOpportunities,
        deactivateBelowRate,
      },
      reason: 'Requester review opportunity tracking is not available yet.',
    };
  }
}
