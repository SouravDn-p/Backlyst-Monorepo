export const SCORING_CONSTANTS = {
  VISIBILITY_COMPLETION_WEIGHT: 50,
  VISIBILITY_QUALITY_WEIGHT: 6,
  EXPERIENCE_WEIGHT: 5,
  VISIBILITY_MAX_EXPERIENCE_SCORE: 20,
  REPUTATION_SUCCESS_REWARD: 5,
  REPUTATION_FAILURE_PENALTY: 15,
  BOOST_DECAY_RATE: 0.15,
  MIN_BOOST_FACTOR: 1,
  MAX_BOOST_FACTOR: 3,
  INITIAL_BOOST_FACTOR: 2.5,
  INITIAL_REPUTATION_SCORE: 50,
  INITIAL_VISIBILITY_SCORE: 50,
  INITIAL_OPPORTUNITY_SCORE: 50,
  INITIAL_DIVERSITY_SCORE: 50,
  INITIAL_RELIABILITY_SCORE: 50,
  INITIAL_INTERNAL_PRIORITY_SCORE: 50,
  INITIAL_RISK_SCORE: 0,
  INITIAL_BOOST_DECAY_COUNT: 10,

  // ---- Risk engine (spec §15) ----
  // Risk deltas applied per marketplace event. A dispute raised against a
  // provider, a requester rejection of the provider's work, a failed completion,
  // or an admin abuse flag all increase risk; a successful completion reduces it.
  RISK_DISPUTE_DELTA: 25,
  RISK_REJECTION_DELTA: 15,
  RISK_FAILURE_DELTA: 10,
  RISK_ABUSE_DELTA: 40,
  RISK_SUCCESS_DELTA: 8,
  // Risk naturally decays toward 0 over time so old events stop penalising.
  RISK_DECAY_PER_DAY: 1.5,
  RISK_DECAY_MAX_DAYS: 90,
};

export type RiskEventType =
  'DISPUTE' | 'REJECTION' | 'FAILURE' | 'ABUSE' | 'SUCCESS';

export const RISK_DELTA_BY_EVENT: Record<RiskEventType, number> = {
  DISPUTE: SCORING_CONSTANTS.RISK_DISPUTE_DELTA,
  REJECTION: SCORING_CONSTANTS.RISK_REJECTION_DELTA,
  FAILURE: SCORING_CONSTANTS.RISK_FAILURE_DELTA,
  ABUSE: SCORING_CONSTANTS.RISK_ABUSE_DELTA,
  SUCCESS: -SCORING_CONSTANTS.RISK_SUCCESS_DELTA,
};

/**
 * Compute the next risk score (0-100) for a website matching profile.
 *
 * The score is time-decayed from its previous value (older risk fades) and then
 * adjusted by the latest event. `wasSuccessful` is mapped to the SUCCESS/FAILURE
 * event when no explicit `eventType` is supplied (backwards-compatible with the
 * existing `updateScoresAfterTask` call sites).
 */
export function calculateRiskScore(
  currentRiskScore: number,
  lastRiskEventAt: Date | null,
  eventType: RiskEventType,
  now: Date = new Date(),
): { riskScore: number; reason: RiskEventType } {
  // Decay the existing score based on elapsed time since the last risk event so
  // old events stop penalising the profile indefinitely.
  let decayed = currentRiskScore;
  if (lastRiskEventAt) {
    const days = Math.min(
      SCORING_CONSTANTS.RISK_DECAY_MAX_DAYS,
      Math.max(0, (now.getTime() - lastRiskEventAt.getTime()) / 86_400_000),
    );
    decayed = Math.max(
      0,
      currentRiskScore - days * SCORING_CONSTANTS.RISK_DECAY_PER_DAY,
    );
  }

  const delta = RISK_DELTA_BY_EVENT[eventType] ?? 0;
  return {
    riskScore: Math.round(clampScore(decayed + delta)),
    reason: eventType,
  };
}

export function clampScore(value: number, min = 0, max = 100) {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function calculateVisibilityScore(
  completionRate: number,
  avgQualityRating: number,
  completedInteractions: number,
): number {
  const completionScore =
    clampScore(completionRate, 0, 1) *
    SCORING_CONSTANTS.VISIBILITY_COMPLETION_WEIGHT;
  const qualityScore =
    clampScore(avgQualityRating, 0, 5) *
    SCORING_CONSTANTS.VISIBILITY_QUALITY_WEIGHT;
  const experienceScore = Math.min(
    SCORING_CONSTANTS.VISIBILITY_MAX_EXPERIENCE_SCORE,
    Math.log1p(Math.max(0, completedInteractions)) *
      SCORING_CONSTANTS.EXPERIENCE_WEIGHT,
  );

  return Math.round(
    clampScore(completionScore + qualityScore + experienceScore),
  );
}

export function calculateReputationScore(
  currentRs: number,
  wasSuccessful: boolean,
  qualityRating?: number,
): number {
  const qualityAdjustment =
    typeof qualityRating === 'number' ? (qualityRating - 3) * 2 : 0;
  const delta = wasSuccessful
    ? SCORING_CONSTANTS.REPUTATION_SUCCESS_REWARD + qualityAdjustment
    : -SCORING_CONSTANTS.REPUTATION_FAILURE_PENALTY;

  return Math.round(clampScore(currentRs + delta));
}

export function calculateBoost(
  currentBf: number,
  currentDecayCount: number,
): { bf: number; decayCount: number } {
  if (currentDecayCount <= 0) {
    return {
      bf: clampScore(
        currentBf,
        SCORING_CONSTANTS.MIN_BOOST_FACTOR,
        SCORING_CONSTANTS.MAX_BOOST_FACTOR,
      ),
      decayCount: 0,
    };
  }

  return {
    bf: clampScore(
      currentBf - SCORING_CONSTANTS.BOOST_DECAY_RATE,
      SCORING_CONSTANTS.MIN_BOOST_FACTOR,
      SCORING_CONSTANTS.MAX_BOOST_FACTOR,
    ),
    decayCount: Math.max(0, currentDecayCount - 1),
  };
}

export function calculateScores(
  profile: {
    reputationScore: number;
    boostFactor: number;
    boostDecayCount: number;
    completedInteractions: number;
  },
  wasSuccessful: boolean,
  completionRate: number,
  avgQualityRating: number,
  qualityRating?: number,
): { vs: number; rs: number; bf: number; decayCount: number } {
  const boost = calculateBoost(profile.boostFactor, profile.boostDecayCount);

  return {
    vs: calculateVisibilityScore(
      completionRate,
      avgQualityRating,
      profile.completedInteractions,
    ),
    rs: calculateReputationScore(
      profile.reputationScore,
      wasSuccessful,
      qualityRating,
    ),
    bf: boost.bf,
    decayCount: boost.decayCount,
  };
}
