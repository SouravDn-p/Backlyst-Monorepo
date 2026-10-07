import { Injectable } from '@nestjs/common';

/**
 * Single owner for the new-user / first-success boost mutation.
 *
 * Previously this logic was duplicated across `ScoringService`
 * (completion path) and `OpportunityGuaranteeCron` (starved-new-user cron
 * path). Both now delegate to `applyNewUserBoost`, which is a pure function of
 * the input profile + ctx so it is trivially idempotent: running it twice on the
 * same input yields the same output, and concurrent completion + cron runs can
 * never over-boost.
 *
 * `BoostDecayCron` remains the *decay* owner, but it imports the same cap /
 * threshold constants from here so grow/decay never fight.
 */

/** Hard cap on the boost factor (reused exactly from the previous code). */
export const MAX_BOOST_FACTOR = 3;

/**
 * A new (untried) user is eligible for the starved-new-user boost only until
 * their first success has been recorded. The cron rule is gated on
 * `!firstSuccessAt`, so once `firstSuccessAt` is stamped the boost can never
 * fire again.
 */
export const FIRST_SUCCESS_THRESHOLD_MS = 0;

/** The starved-new-user rule only fires once a profile has gone this long
 *  without a match (hours). Mirrors the previous `hoursSinceLastMatch > 72`
 *  gate. */
export const STARVED_NEW_USER_HOURS = 72;

/**
 * Increment applied by the starved-new-user cron rule. It is a ONE-TIME
 * benefit: `applyNewUserBoost` only applies it while `firstSuccessBoostActive`
 * is still true (i.e. before the cron has ever granted it), so repeated cron
 * runs can never compound it.
 */
export const STARVED_NEW_USER_INCREMENT = 0.5;

export interface NewUserBoostProfile {
  boostFactor: number;
  firstSuccessAt: Date | null;
  firstSuccessBoostActive: boolean;
}

export interface NewUserBoostContext {
  /**
   * Whether the triggering event is a successful task completion. On the
   * completion path this is `true`/`false` (the actual success state). On the
   * cron path it is `false` (the cron never represents a completion).
   */
  wasSuccessful?: boolean;
  /**
   * Hours since the profile's last match. Only meaningful for the cron's
   * starved-new-user rule. Omit on the completion path.
   */
  hoursSinceLastMatch?: number;
  /** Timestamp to stamp `firstSuccessAt` with when a first success occurs. */
  now?: Date;
}

export interface NewUserBoostResult {
  boostFactor: number;
  firstSuccessAt: Date | null;
  firstSuccessBoostActive: boolean;
}

@Injectable()
export class BoostService {
  /**
   * Compute the next `{ boostFactor, firstSuccessAt, firstSuccessBoostActive }`
   * for the new-user / first-success boost.
   *
   * Pure function of `(profile, ctx)` — no I/O, no mutation of the input.
   *
   * Rules (preserved from the original split implementation):
   *  - First-success (completion path): on a successful completion, the
   *    one-time new-user boost is consumed (`firstSuccessBoostActive` cleared)
   *    and `firstSuccessAt` is stamped (only once). No boostFactor change here.
   *  - Starved-new-user (cron path): if the profile has not yet recorded a
   *    first success, has the new-user boost still active, AND has been starved
   *    (`hoursSinceLastMatch > 72`), nudge the boost factor up by 0.5, capped at
   *    `MAX_BOOST_FACTOR`. The boost is granted exactly once: `firstSuccessBoostActive`
   *    is cleared so a later cron run (or the completion path) can never grant
   *    it again.
   *
   * Idempotency: both the firstSuccessAt stamp and the starved-new-user
   * increment are one-time and gated on the current profile state, so running
   * this on the same input twice — or firing the completion path and the cron
   * path for the same profile in the same window — can never over-boost.
   */
  applyNewUserBoost(
    profile: NewUserBoostProfile,
    ctx: NewUserBoostContext = {},
  ): NewUserBoostResult {
    const now = ctx.now ?? new Date();

    let { boostFactor, firstSuccessAt, firstSuccessBoostActive } = profile;

    // --- First-success (completion) path -----------------------------------
    if (ctx.wasSuccessful) {
      // One-time benefit: only stamp firstSuccessAt if it isn't already set.
      if (!firstSuccessAt) {
        firstSuccessAt = now;
      }
      // The new-user boost is consumed on the provider's first successful
      // completion, then cleared so it is a one-time benefit.
      firstSuccessBoostActive = false;
    }

    // --- Starved-new-user (cron) path --------------------------------------
    // Eligible only before the first success AND only while the one-time
    // new-user boost is still active. `firstSuccessBoostActive` is cleared once
    // granted so repeated cron runs can never compound the increment. This
    // mirrors the previous `hoursSinceLastMatch > 72 && !firstSuccessAt` gate
    // (firstSuccessAt is still null here) plus the one-time-bonus guard.
    if (
      firstSuccessBoostActive &&
      !firstSuccessAt &&
      ctx.hoursSinceLastMatch !== undefined &&
      ctx.hoursSinceLastMatch > STARVED_NEW_USER_HOURS
    ) {
      boostFactor = Math.min(
        MAX_BOOST_FACTOR,
        profile.boostFactor + STARVED_NEW_USER_INCREMENT,
      );
      firstSuccessBoostActive = false;
    }

    return { boostFactor, firstSuccessAt, firstSuccessBoostActive };
  }
}
