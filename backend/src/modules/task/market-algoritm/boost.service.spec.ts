import { BoostService, MAX_BOOST_FACTOR } from './boost.service';

function makeProfile(
  over: {
    boostFactor?: number;
    firstSuccessAt?: Date | null;
    firstSuccessBoostActive?: boolean;
  } = {},
) {
  return {
    boostFactor: over.boostFactor ?? 1,
    firstSuccessAt: over.firstSuccessAt ?? null,
    firstSuccessBoostActive: over.firstSuccessBoostActive ?? true,
  };
}

describe('BoostService — single owner of new-user / first-success boost', () => {
  const service = new BoostService();

  describe('completion path (wasSuccessful)', () => {
    it('stamps firstSuccessAt once and clears the one-time boost on first success', () => {
      const now = new Date('2026-07-17T00:00:00Z');
      const profile = makeProfile({
        boostFactor: 1.5,
        firstSuccessAt: null,
        firstSuccessBoostActive: true,
      });

      const result = service.applyNewUserBoost(profile, {
        wasSuccessful: true,
        now,
      });

      expect(result.firstSuccessAt).toBe(now);
      expect(result.firstSuccessBoostActive).toBe(false);
      // boostFactor is owned by the scoring formula on this path; BoostService
      // must not change it.
      expect(result.boostFactor).toBe(profile.boostFactor);
    });

    it('does not overwrite an already-stamped firstSuccessAt (idempotent one-time)', () => {
      const earlier = new Date('2026-01-01T00:00:00Z');
      const now = new Date('2026-07-17T00:00:00Z');
      const profile = makeProfile({
        firstSuccessAt: earlier,
        firstSuccessBoostActive: false,
      });

      const result = service.applyNewUserBoost(profile, {
        wasSuccessful: true,
        now,
      });

      expect(result.firstSuccessAt).toBe(earlier);
      expect(result.firstSuccessBoostActive).toBe(false);
    });

    it('does not apply the starved-new-user cron increment on the completion path', () => {
      // Even with hoursSinceLastMatch > 72, the completion path must not nudge
      // boostFactor because it represents a completion, not starvation.
      const profile = makeProfile({
        boostFactor: 1,
        firstSuccessAt: null,
        firstSuccessBoostActive: true,
      });
      const result = service.applyNewUserBoost(profile, {
        wasSuccessful: true,
        hoursSinceLastMatch: 200,
        now: new Date(),
      });
      expect(result.boostFactor).toBe(profile.boostFactor);
    });
  });

  describe('cron path (starved new user)', () => {
    it('nudges boostFactor up by 0.5 when starved and not yet first-successed', () => {
      const profile = makeProfile({
        boostFactor: 1,
        firstSuccessAt: null,
        firstSuccessBoostActive: true,
      });
      const result = service.applyNewUserBoost(profile, {
        hoursSinceLastMatch: 100,
      });
      expect(result.boostFactor).toBe(1.5);
      // Cron path never represents a completion -> firstSuccessAt untouched.
      expect(result.firstSuccessAt).toBeNull();
    });

    it('does NOT nudge boostFactor when within the 72h window', () => {
      const profile = makeProfile({
        boostFactor: 1,
        firstSuccessAt: null,
        firstSuccessBoostActive: true,
      });
      const result = service.applyNewUserBoost(profile, {
        hoursSinceLastMatch: 72,
      });
      expect(result.boostFactor).toBe(profile.boostFactor);
    });

    it('does NOT nudge boostFactor once firstSuccessAt is set', () => {
      const profile = makeProfile({
        boostFactor: 2,
        firstSuccessAt: new Date(),
        firstSuccessBoostActive: false,
      });
      const result = service.applyNewUserBoost(profile, {
        hoursSinceLastMatch: 1000,
      });
      expect(result.boostFactor).toBe(profile.boostFactor);
    });
  });

  describe('idempotency', () => {
    it('running the completion path twice yields identical results', () => {
      const now = new Date('2026-07-17T00:00:00Z');
      const profile = makeProfile({
        boostFactor: 1.5,
        firstSuccessAt: null,
        firstSuccessBoostActive: true,
      });

      const first = service.applyNewUserBoost(profile, {
        wasSuccessful: true,
        now,
      });
      const second = service.applyNewUserBoost(
        {
          ...profile,
          firstSuccessAt: first.firstSuccessAt,
          firstSuccessBoostActive: first.firstSuccessBoostActive,
        },
        { wasSuccessful: true, now },
      );

      expect(second).toEqual(first);
    });

    it('running the cron path twice yields identical results (no compounding increment)', () => {
      const profile = makeProfile({
        boostFactor: 1,
        firstSuccessAt: null,
        firstSuccessBoostActive: true,
      });

      const first = service.applyNewUserBoost(profile, {
        hoursSinceLastMatch: 100,
      });
      const second = service.applyNewUserBoost(first, {
        hoursSinceLastMatch: 100,
      });

      expect(second.boostFactor).toBe(first.boostFactor);
      expect(second.boostFactor).toBe(1.5); // not 2.0
    });

    it('is a pure function: never mutates the input profile', () => {
      const profile = makeProfile({
        boostFactor: 1,
        firstSuccessAt: null,
        firstSuccessBoostActive: true,
      });
      const snapshot = JSON.parse(JSON.stringify(profile));
      service.applyNewUserBoost(profile, {
        wasSuccessful: true,
        now: new Date(),
      });
      service.applyNewUserBoost(profile, { hoursSinceLastMatch: 100 });
      expect(profile).toEqual(snapshot);
    });
  });

  describe('no double boost when both fire for the same profile in the same window', () => {
    it('completion then cron (or cron then completion) never over-boosts', () => {
      const now = new Date('2026-07-17T00:00:00Z');
      // Fresh new-user profile, starved (>72h).
      let state = makeProfile({
        boostFactor: 1,
        firstSuccessAt: null,
        firstSuccessBoostActive: true,
      });

      // Cron fires first (starved new user -> +0.5).
      state = service.applyNewUserBoost(state, { hoursSinceLastMatch: 100 });
      expect(state.boostFactor).toBe(1.5);

      // Then completion fires (first success -> clears boost, stamps date).
      state = service.applyNewUserBoost(state, { wasSuccessful: true, now });
      expect(state.firstSuccessAt).toBe(now);
      expect(state.firstSuccessBoostActive).toBe(false);
      expect(state.boostFactor).toBe(1.5); // unchanged by completion path

      // Now a later cron run must NOT add another +0.5 because firstSuccessAt is set.
      const after = service.applyNewUserBoost(state, {
        hoursSinceLastMatch: 200,
      });
      expect(after.boostFactor).toBe(1.5);
    });

    it('completion then cron in the same window does not add a second increment', () => {
      const now = new Date('2026-07-17T00:00:00Z');
      let state = makeProfile({
        boostFactor: 1,
        firstSuccessAt: null,
        firstSuccessBoostActive: true,
      });

      // Completion first.
      state = service.applyNewUserBoost(state, { wasSuccessful: true, now });
      // Cron later (still starved in hours, but firstSuccessAt now set).
      state = service.applyNewUserBoost(state, { hoursSinceLastMatch: 100 });

      // Only ever the +0.5 from the one starved window is possible, and here the
      // completion ran first so even that never happened; boost stays at 1.
      expect(state.boostFactor).toBe(1);
      expect(state.firstSuccessAt).toBe(now);
    });
  });

  describe('cap never exceeds 3', () => {
    it('clamps the starved-new-user increment at MAX_BOOST_FACTOR', () => {
      const profile = makeProfile({
        boostFactor: 2.8,
        firstSuccessAt: null,
        firstSuccessBoostActive: true,
      });
      const result = service.applyNewUserBoost(profile, {
        hoursSinceLastMatch: 100,
      });
      expect(result.boostFactor).toBe(MAX_BOOST_FACTOR);
      expect(result.boostFactor).toBeLessThanOrEqual(3);
      expect(result.boostFactor).toBe(3);
    });

    it('does not exceed the cap across many repeated cron runs', () => {
      let state = makeProfile({
        boostFactor: 2.9,
        firstSuccessAt: null,
        firstSuccessBoostActive: true,
      });
      for (let i = 0; i < 50; i++) {
        state = service.applyNewUserBoost(state, { hoursSinceLastMatch: 1000 });
      }
      expect(state.boostFactor).toBe(3);
    });
  });
});
