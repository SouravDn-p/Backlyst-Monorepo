import { QualityStatusEngine } from './quality-status.engine';

// Only the pure decision logic (resolveTargetStatus / applyGradualTransition) is
// unit-tested here; reconcileStatus is a thin persistence wrapper covered by
// integration paths. Prisma / config deps are unused by the pure methods.
const engine = new QualityStatusEngine(null as any, null as any);

const CONFIG = {
  qualityActiveThreshold: 60,
  qualityLowPriorityThreshold: 40,
  qualityLimitedAccessThreshold: 25,
  qualityMinInteractionsForStatus: 5,
  qualityUnderReviewRiskThreshold: 60,
};

describe('QualityStatusEngine.resolveTargetStatus', () => {
  it('maps a high quality score to ACTIVE', () => {
    expect(
      engine.resolveTargetStatus(
        {
          qualityScore: 80,
          riskScore: 0,
          completedInteractions: 20,
          currentStatus: 'ACTIVE',
        },
        CONFIG,
      ),
    ).toBe('ACTIVE');
  });

  it('maps a mid score to LOW_PRIORITY', () => {
    expect(
      engine.resolveTargetStatus(
        {
          qualityScore: 45,
          riskScore: 0,
          completedInteractions: 20,
          currentStatus: 'LOW_PRIORITY',
        },
        CONFIG,
      ),
    ).toBe('LOW_PRIORITY');
  });

  it('maps a low score to LIMITED_ACCESS', () => {
    expect(
      engine.resolveTargetStatus(
        {
          qualityScore: 30,
          riskScore: 0,
          completedInteractions: 20,
          currentStatus: 'LIMITED_ACCESS',
        },
        CONFIG,
      ),
    ).toBe('LIMITED_ACCESS');
  });

  it('maps a very low score to RESTRICTED', () => {
    expect(
      engine.resolveTargetStatus(
        {
          qualityScore: 10,
          riskScore: 0,
          completedInteractions: 20,
          currentStatus: 'RESTRICTED',
        },
        CONFIG,
      ),
    ).toBe('RESTRICTED');
  });

  it('forces UNDER_REVIEW when risk exceeds the threshold', () => {
    expect(
      engine.resolveTargetStatus(
        {
          qualityScore: 90,
          riskScore: 70,
          completedInteractions: 20,
          currentStatus: 'ACTIVE',
        },
        CONFIG,
      ),
    ).toBe('UNDER_REVIEW');
  });

  it('never auto-degrades a brand-new site below ACTIVE', () => {
    expect(
      engine.resolveTargetStatus(
        {
          qualityScore: 10,
          riskScore: 0,
          completedInteractions: 2,
          currentStatus: 'ACTIVE',
        },
        CONFIG,
      ),
    ).toBe('ACTIVE');
  });

  it('never auto-overrides an admin SUSPENDED status', () => {
    expect(
      engine.resolveTargetStatus(
        {
          qualityScore: 95,
          riskScore: 0,
          completedInteractions: 20,
          currentStatus: 'SUSPENDED',
        },
        CONFIG,
      ),
    ).toBe('SUSPENDED');
  });
});

describe('QualityStatusEngine.applyGradualTransition', () => {
  it('moves at most one band down when gradual', () => {
    // ACTIVE -> RESTRICTED target, gradual => LOW_PRIORITY (one step).
    expect(engine.applyGradualTransition('ACTIVE', 'RESTRICTED', true)).toBe(
      'LOW_PRIORITY',
    );
  });

  it('moves at most one band up when gradual (recovery)', () => {
    // RESTRICTED -> ACTIVE target, gradual => LIMITED_ACCESS (one step up).
    expect(engine.applyGradualTransition('RESTRICTED', 'ACTIVE', true)).toBe(
      'LIMITED_ACCESS',
    );
  });

  it('jumps directly to target when gradual is disabled', () => {
    expect(engine.applyGradualTransition('ACTIVE', 'RESTRICTED', false)).toBe(
      'RESTRICTED',
    );
  });

  it('transitions non-ladder statuses (UNDER_REVIEW) directly', () => {
    expect(engine.applyGradualTransition('ACTIVE', 'UNDER_REVIEW', true)).toBe(
      'UNDER_REVIEW',
    );
  });

  it('is a no-op when already at target', () => {
    expect(engine.applyGradualTransition('ACTIVE', 'ACTIVE', true)).toBe(
      'ACTIVE',
    );
  });
});
