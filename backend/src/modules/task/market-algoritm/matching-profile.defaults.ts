import { SCORING_CONSTANTS } from './scoring.utils';
import type { Prisma } from '@prisma/client';

/**
 * Canonical default values for a newly-created `WebsiteMatchingProfile`.
 *
 * Historically the same defaults were duplicated (and slightly inconsistent)
 * between `ValidationEngine.ensureProfile` and `ScoringService`
 * upsert. Both call sites now delegate to this single source of truth so a
 * missing profile is always created with identical, safe defaults
 * (ACTIVE, risk 0, mid-range scores, standard boost) and is then evaluated
 * by the same marketplace gates as any other profile.
 */
export const DEFAULT_MATCHING_PROFILE: Omit<
  Prisma.WebsiteMatchingProfileCreateWithoutWebsiteInput,
  'user'
> = {
  visibilityScore: SCORING_CONSTANTS.INITIAL_VISIBILITY_SCORE,
  opportunityScore: SCORING_CONSTANTS.INITIAL_OPPORTUNITY_SCORE,
  reputationScore: SCORING_CONSTANTS.INITIAL_REPUTATION_SCORE,
  boostFactor: SCORING_CONSTANTS.INITIAL_BOOST_FACTOR,
  boostDecayCount: SCORING_CONSTANTS.INITIAL_BOOST_DECAY_COUNT,
  marketplaceStatus: 'ACTIVE',
  internalPriorityScore: SCORING_CONSTANTS.INITIAL_INTERNAL_PRIORITY_SCORE,
  reliabilityScore: SCORING_CONSTANTS.INITIAL_RELIABILITY_SCORE,
  riskScore: SCORING_CONSTANTS.INITIAL_RISK_SCORE,
  diversityScore: SCORING_CONSTANTS.INITIAL_DIVERSITY_SCORE,
};

/**
 * Build the canonical `create` payload for a default matching profile, binding
 * it to the owning website + author. Returns a Prisma create input ready to
 * pass to `websiteMatchingProfile.upsert({ where, create, update: {} })`.
 */
export function buildDefaultMatchingProfileCreate(params: {
  websiteId: string;
  userId: string;
}): Prisma.WebsiteMatchingProfileCreateInput {
  return {
    website: { connect: { id: params.websiteId } },
    user: { connect: { id: params.userId } },
    ...DEFAULT_MATCHING_PROFILE,
  };
}
