import {
  calculateBoost,
  calculateReputationScore,
  calculateScores,
  calculateVisibilityScore,
} from './scoring.utils';

describe('marketplace scoring utils', () => {
  it('calculates and clamps visibility score', () => {
    expect(calculateVisibilityScore(1, 5, 100)).toBe(100);
    expect(calculateVisibilityScore(0, 0, 0)).toBe(0);
  });

  it('rewards success and penalizes failure in reputation score', () => {
    expect(calculateReputationScore(50, true, 5)).toBeGreaterThan(50);
    expect(calculateReputationScore(50, false)).toBeLessThan(50);
  });

  it('decays boost while respecting minimum value', () => {
    expect(calculateBoost(2.5, 2)).toEqual({ bf: 2.35, decayCount: 1 });
    expect(calculateBoost(1, 0)).toEqual({ bf: 1, decayCount: 0 });
  });

  it('returns combined score fields', () => {
    const scores = calculateScores(
      {
        reputationScore: 50,
        boostFactor: 2.5,
        boostDecayCount: 1,
        completedInteractions: 1,
      },
      true,
      1,
      4,
      4,
    );

    expect(scores.vs).toBeGreaterThan(0);
    expect(scores.rs).toBeGreaterThan(50);
    expect(scores.bf).toBeLessThan(2.5);
    expect(scores.decayCount).toBe(0);
  });
});
