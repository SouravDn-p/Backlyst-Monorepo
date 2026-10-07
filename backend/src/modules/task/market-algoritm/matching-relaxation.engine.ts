import { Injectable } from '@nestjs/common';
import { MatchCandidate } from './matching.types';

export type RelaxationStage = 'EXACT' | 'RELATED' | 'BROAD' | 'FALLBACK';

/**
 * Marketplace relaxation engine.
 *
 * Extracted from MatchingEngine.applyRelaxation so the relaxation policy lives in
 * its own, testable, configurable unit (spec §3). Each numeric level maps to a
 * semantic stage and the candidate passes only if it satisfies that level.
 *
 * The pass/fail truth table is preserved 1:1 from the original inline logic:
 *
 *   level 0 -> EXACT    : category EXACT + tags EXACT + country/language exact-or-unknown
 *   level 1 -> RELATED  : category EXACT + tags PARTIAL + language exact-or-unknown
 *   level 2 -> BROAD    : category RELATED + country exact-or-unknown
 *   level 3 -> BROAD    : category RELATED OR tags PARTIAL
 *   level 4 -> FALLBACK : any (passthrough, last resort before empty result)
 */
@Injectable()
export class MatchingRelaxationEngine {
  /** Returns the semantic stage for a numeric relaxation level. */
  stageForLevel(level: number): RelaxationStage {
    switch (level) {
      case 0:
        return 'EXACT';
      case 1:
        return 'RELATED';
      case 2:
      case 3:
        return 'BROAD';
      default:
        return 'FALLBACK';
    }
  }

  /**
   * Apply a relaxation level to a candidate.
   * Returns the annotated candidate (with relaxationLevel + reasons) when it
   * passes the level, otherwise null (candidate is dropped for this level).
   */
  apply(candidate: MatchCandidate, level: number): MatchCandidate | null {
    const a = candidate.matchingAttributes;
    const categoryExact = a.category === 'EXACT';
    const categoryRelated = a.category === 'EXACT' || a.category === 'RELATED';
    const categoryBroad =
      a.category === 'EXACT' ||
      a.category === 'RELATED' ||
      a.category === 'BROAD' ||
      a.category === 'LEGACY_FALLBACK';
    const tagsExact = a.tags === 'EXACT';
    const tagsPartial = a.tags === 'EXACT' || a.tags === 'PARTIAL';
    const countryOk = a.country === 'EXACT' || a.country === 'UNKNOWN';
    const languageOk = a.language === 'EXACT' || a.language === 'UNKNOWN';

    // Truth table mirrors the new classification
    // Level 0: EXACT category, tags EXACT, strict filters.
    // Level 1: RELATED canonical category, tag overlap.
    // Level 2: BROAD category relationship.
    // Level 3: Relax optional filters.
    // Level 4: FALLBACK (UNRELATED, otherwise safe).
    const passes =
      level === 0
        ? categoryExact && tagsExact && countryOk && languageOk
        : level === 1
          ? categoryRelated && tagsPartial && languageOk
          : level === 2
            ? categoryBroad && countryOk
            : level === 3
              ? categoryBroad || tagsPartial
              : true; // level >= 4 -> FALLBACK passthrough

    if (!passes) return null;

    return {
      ...candidate,
      relaxationLevel: level,
      reasons: [
        `RELAXATION_${this.stageForLevel(level)}`,
        `RELAXATION_LEVEL_${level}`,
        `CATEGORY_${a.category}`,
        `TAGS_${a.tags}`,
        `COUNTRY_${a.country}`,
        `LANGUAGE_${a.language}`,
        `AUTHORITY_${a.authority}`,
      ],
    };
  }
}
