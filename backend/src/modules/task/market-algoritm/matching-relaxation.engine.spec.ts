import { MatchingRelaxationEngine } from './matching-relaxation.engine';
import { MatchCandidate } from './matching.types';

function candidate(
  attrs: Partial<MatchCandidate['matchingAttributes']>,
): MatchCandidate {
  return {
    task: {} as any,
    providerWebsite: {} as any,
    requesterWebsite: {} as any,
    compatibilityScore: 80,
    relaxationLevel: 0,
    matchingAttributes: {
      category: 'UNRELATED',
      tags: 'ANY',
      country: 'UNKNOWN',
      language: 'UNKNOWN',
      authority: 'UNKNOWN',
      ...attrs,
    },
    reasons: [],
  };
}

describe('MatchingRelaxationEngine', () => {
  const engine = new MatchingRelaxationEngine();

  it('maps levels to semantic stages', () => {
    expect(engine.stageForLevel(0)).toBe('EXACT');
    expect(engine.stageForLevel(1)).toBe('RELATED');
    expect(engine.stageForLevel(2)).toBe('BROAD');
    expect(engine.stageForLevel(3)).toBe('BROAD');
    expect(engine.stageForLevel(4)).toBe('FALLBACK');
  });

  it('EXACT (level 0) requires category+tags exact and country/language exact-or-unknown', () => {
    const exact = candidate({
      category: 'EXACT',
      tags: 'EXACT',
      country: 'EXACT',
      language: 'EXACT',
    });
    expect(engine.apply(exact, 0)).not.toBeNull();
    const missingTag = candidate({
      category: 'EXACT',
      tags: 'PARTIAL',
      country: 'EXACT',
      language: 'EXACT',
    });
    expect(engine.apply(missingTag, 0)).toBeNull();
  });

  it('RELATED (level 1) allows partial tags but still requires category exact or related', () => {
    const ok = candidate({
      category: 'EXACT',
      tags: 'PARTIAL',
      language: 'EXACT',
    });
    expect(engine.apply(ok, 1)).not.toBeNull();
    const okRelated = candidate({
      category: 'RELATED',
      tags: 'PARTIAL',
      language: 'EXACT',
    });
    expect(engine.apply(okRelated, 1)).not.toBeNull();
    const badCat = candidate({
      category: 'BROAD',
      tags: 'PARTIAL',
      language: 'EXACT',
    });
    expect(engine.apply(badCat, 1)).toBeNull();
  });

  it('BROAD (levels 2-3) allows broad category or partial tags', () => {
    expect(
      engine.apply(candidate({ category: 'BROAD', country: 'EXACT' }), 2),
    ).not.toBeNull();
    expect(
      engine.apply(candidate({ category: 'BROAD', tags: 'PARTIAL' }), 3),
    ).not.toBeNull();
    expect(
      engine.apply(candidate({ category: 'UNRELATED', tags: 'ANY' }), 3),
    ).toBeNull();
  });

  it('FALLBACK (level 4) passes anything', () => {
    expect(
      engine.apply(
        candidate({
          category: 'UNRELATED',
          tags: 'ANY',
          country: 'ANY',
          language: 'ANY',
        }),
        4,
      ),
    ).not.toBeNull();
  });

  it('annotates the candidate with relaxationLevel + stage reason', () => {
    const res = engine.apply(
      candidate({
        category: 'EXACT',
        tags: 'EXACT',
        country: 'EXACT',
        language: 'EXACT',
      }),
      0,
    );
    expect(res?.relaxationLevel).toBe(0);
    expect(res?.reasons).toContain('RELAXATION_EXACT');
    expect(res?.reasons).toContain('RELAXATION_LEVEL_0');
  });
});
