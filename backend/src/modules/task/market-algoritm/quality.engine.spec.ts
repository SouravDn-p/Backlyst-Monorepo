import { QualityEngine } from './quality.engine';

const engine = new QualityEngine();

// A profile with strong completion/reliability/rating but LOW diversity +
// behaviour, so the composite is measurably pulled down when those signals are
// folded in (the audit's stated §6 responsibility gap being closed here).
const baseProfile = {
  completedInteractions: 20,
  failedInteractions: 0,
  totalInteractions: 20,
  successfulInteractions: 20,
  qualityRatingSum: 100, // 20 ratings of 5.0 => avg 5.0
  avgQualityRating: 5,
  diversityScore: 50,
  behaviourScore: 50,
  lastMatchedAt: new Date(),
};

describe('QualityEngine.computeMetrics — composite folds diversity + behaviour (spec §6)', () => {
  it('surfaces every sub-signal on the returned metrics', () => {
    const m = engine.computeMetrics(baseProfile, true, 5, {
      lastMatchedAt: new Date(),
      diversityScore: 50,
      behaviourScore: 50,
    });
    expect(m).toHaveProperty('completionScore');
    expect(m).toHaveProperty('ratingScore');
    expect(m).toHaveProperty('diversityScore', 50);
    expect(m).toHaveProperty('behaviourScore', 50);
    expect(m.compositeQualityScore).toBeGreaterThan(0);
    expect(m.compositeQualityScore).toBeLessThanOrEqual(100);
  });

  it('lowers the composite when diversity + behaviour are poor', () => {
    const good = engine.computeMetrics(baseProfile, true, 5, {
      lastMatchedAt: new Date(),
      diversityScore: 100,
      behaviourScore: 100,
    });
    const poor = engine.computeMetrics(baseProfile, true, 5, {
      lastMatchedAt: new Date(),
      diversityScore: 0,
      behaviourScore: 0,
    });
    expect(poor.compositeQualityScore).toBeLessThan(good.compositeQualityScore);
  });

  it('respects configurable weights (zeroing a signal removes its influence)', () => {
    const withDiversity = engine.computeMetrics(baseProfile, true, 5, {
      diversityScore: 0,
      behaviourScore: 100,
      weights: { qualityDiversityWeight: 0.5 },
    });
    const withoutDiversity = engine.computeMetrics(baseProfile, true, 5, {
      diversityScore: 0,
      behaviourScore: 100,
      weights: { qualityDiversityWeight: 0 },
    });

    // Removing the (poor) diversity weight should not lower the composite.
    expect(withoutDiversity.compositeQualityScore).toBeGreaterThanOrEqual(
      withDiversity.compositeQualityScore,
    );
  });

  it('falls back to a simple mean when all weights are zero', () => {
    const m = engine.computeMetrics(baseProfile, true, 5, {
      diversityScore: 50,
      behaviourScore: 50,
      weights: {
        qualityCompletionWeight: 0,
        qualityReliabilityWeight: 0,
        qualityRatingWeight: 0,
        qualityActivityWeight: 0,
        qualityConsistencyWeight: 0,
        qualityDiversityWeight: 0,
        qualityBehaviourWeight: 0,
      },
    });
    expect(m.compositeQualityScore).toBeGreaterThan(0);
  });
});

describe('QualityEngine.isPremiumAccessEligible (spec §6)', () => {
  it('grants premium access to high-quality ACTIVE sites', () => {
    expect(engine.isPremiumAccessEligible(80, 'ACTIVE', 75)).toBe(true);
  });

  it('denies premium access below the threshold', () => {
    expect(engine.isPremiumAccessEligible(70, 'ACTIVE', 75)).toBe(false);
  });

  it('denies premium access to non-ACTIVE sites regardless of score', () => {
    expect(engine.isPremiumAccessEligible(95, 'LOW_PRIORITY', 75)).toBe(false);
    expect(engine.isPremiumAccessEligible(95, 'RESTRICTED', 75)).toBe(false);
  });

  it('treats a 0 threshold as "gating disabled" (all eligible)', () => {
    expect(engine.isPremiumAccessEligible(10, 'ACTIVE', 0)).toBe(true);
  });
});
