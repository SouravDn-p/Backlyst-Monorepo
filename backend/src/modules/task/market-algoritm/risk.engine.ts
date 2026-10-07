import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, PrismaClient } from '@prisma/client';

type TxClient = PrismaClient | Prisma.TransactionClient;
import {
  calculateRiskScore,
  RISK_DELTA_BY_EVENT,
  type RiskEventType,
} from './scoring.utils';

export interface ProcessRiskEventResult {
  riskScore: number;
  reason: RiskEventType;
}

/**
 * Single writer for a website matching profile's `riskScore` and the immutable
 * `RiskEvent` audit row. All risk deltas (disputes, rejections, failures, abuse
 * flags, successful completions) MUST flow through this engine so the decay math
 * in `calculateRiskScore` and the `RiskEvent` ledger stay consistent.
 *
 * Callers (graduated-penalty paths, dispute resolution, pattern monitor) may
 * still own their own *boost* decisions — the engine only ever writes risk.
 */
@Injectable()
export class RiskEngine {
  private readonly logger = new Logger(RiskEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Apply a risk event to a profile.
   *
   * @param websiteId      Profile's website id (also the RiskEvent owner).
   * @param eventType      Explicit event type — DISPUTE / REJECTION / FAILURE /
   *                       ABUSE / SUCCESS.
   * @param profile        Optional pre-loaded matching profile. When omitted the
   *                       engine loads it itself (one query) so callers do not
   *                       have to fetch it just to mutate risk.
   * @param tx             Optional Prisma transaction client so callers inside a
   *                       `$transaction` can keep the RiskEvent row in the same
   *                       atomic unit.
   */
  async processRiskEvent(
    websiteId: string,
    eventType: RiskEventType,
    profile?: { riskScore: number; lastRiskEventAt: Date | null } | null,
    tx?: TxClient,
  ): Promise<ProcessRiskEventResult> {
    const db = tx ?? this.prisma;
    const loaded =
      profile ??
      (await db.websiteMatchingProfile.findUnique({
        where: { websiteId },
        select: { riskScore: true, lastRiskEventAt: true },
      }));

    if (!loaded) {
      // No profile to mutate — still record the event if one existed, but keep
      // behaviour safe by treating the current risk as 0.
      this.logger.warn(
        `RiskEngine.processRiskEvent: no matching profile for website ${websiteId}; skipping risk mutation.`,
      );
      return { riskScore: 0, reason: eventType };
    }

    const risk = calculateRiskScore(
      loaded.riskScore,
      loaded.lastRiskEventAt,
      eventType,
    );

    await db.websiteMatchingProfile.update({
      where: { websiteId },
      data: {
        riskScore: risk.riskScore,
        lastRiskEventAt: new Date(),
        lastRiskReason: eventType,
      },
    });

    await db.riskEvent
      .create({
        data: {
          websiteId,
          type: eventType,
          delta: RISK_DELTA_BY_EVENT[eventType],
          riskScoreAfter: risk.riskScore,
        },
      })
      .catch(() => {});

    return risk;
  }

  /**
   * Spec §15: Compute the "Dynamic Risk Score" (effective risk) for a profile.
   * This synthesizes the event-driven ledger score with real-time continuous
   * risk penalties (unique domains, interaction velocity, niche concentration)
   * to ensure abusers are blocked by the Validation Engine.
   */
  calculateEffectiveRisk(
    profile: {
      riskScore: number;
      diversityScore?: number;
      behaviourScore?: number;
    },
    candidateNicheConcentration?: 'LOW' | 'MODERATE' | 'HIGH' | 'CAPPED',
  ): number {
    let effectiveRisk = profile.riskScore;

    // Spec §15: Unique Domain Requirements (diversityScore)
    // Lower diversity means higher concentration behaviour => higher risk.
    const diversity = profile.diversityScore ?? 50;
    if (diversity < 30) {
      effectiveRisk += 15;
    } else if (diversity < 50) {
      effectiveRisk += 5;
    }

    // Spec §15: Interaction Velocity Requirements (behaviourScore)
    // Lower behaviour score (erratic timing, bursts) => higher risk.
    const behaviour = profile.behaviourScore ?? 50;
    if (behaviour < 40) {
      effectiveRisk += 15;
    }

    // Spec §15: Niche Concentration Requirements
    // Excessive niche concentration => higher risk.
    if (candidateNicheConcentration === 'HIGH') {
      effectiveRisk += 10;
    } else if (candidateNicheConcentration === 'CAPPED') {
      effectiveRisk += 20;
    }

    return Math.min(100, Math.max(0, effectiveRisk));
  }
}
