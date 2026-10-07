import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  BehaviourPatternSeverity,
  BehaviourPatternType,
  Prisma,
} from '@prisma/client';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// Spec P5b: anomalous interaction-cadence detection, intentionally distinct from
// RiskEngine (penalties/risk deltas) and PatternMonitorService (graph clusters /
// reciprocal rings). This service looks at *temporal behaviour* of a single
// website's interactions: erratic timing, rating clustering, and burst-vs-idle
// switching. Findings are persisted as first-class `BehaviourPattern` rows and
// distilled into a `behaviourScore` (0..100) on the WebsiteMatchingProfile.
@Injectable()
export class BehaviourPatternService {
  private readonly logger = new Logger(BehaviourPatternService.name);

  // How far back to look when scoring a website window.
  private readonly windowDays = 30;

  // Minimum number of interactions before cadence patterns are meaningful.
  private readonly minInteractions = 5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scan a single website's recent interactions and persist any detected
   * behaviour patterns. Returns the computed behaviourScore (0..100).
   */
  async scanWebsite(websiteId: string): Promise<number> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.windowDays * MS_PER_DAY);

    const interactions = await this.prisma.domainInteraction.findMany({
      where: {
        OR: [{ sourceWebsiteId: websiteId }, { targetWebsiteId: websiteId }],
        completedAt: { gte: windowStart },
      },
      orderBy: { completedAt: 'asc' },
      select: { completedAt: true, taskId: true },
    });

    const ratings = await this.prisma.qualityRubric.findMany({
      where: { providerWebsiteId: websiteId },
      orderBy: { createdAt: 'asc' },
      select: { compositeScore: true, createdAt: true },
    });

    if (interactions.length < this.minInteractions) {
      // Not enough signal yet — leave the existing score untouched (or default).
      return 50;
    }

    const gaps = this.computeGaps(
      interactions.map((i) => i.completedAt.getTime()),
    );

    const detections = [
      this.detectErraticTiming(gaps, interactions.length, windowStart, now),
      this.detectRatingClustering(
        ratings.map((r) => r.compositeScore),
        windowStart,
        now,
      ),
      this.detectBurstIdleSwitch(gaps, windowStart, now),
    ].filter((d): d is NonNullable<typeof d> => d !== null);

    await this.persistDetections(websiteId, detections, windowStart, now);

    const behaviourScore = this.computeBehaviourScore(
      detections,
      interactions.length,
    );
    await this.prisma.websiteMatchingProfile.updateMany({
      where: { websiteId },
      data: { behaviourScore, lastBehaviourScoredAt: now },
    });

    return behaviourScore;
  }

  /**
   * Scan every website that has a matching profile. Best-effort: a single
   * website failure must not abort the whole sweep (used by the cron).
   */
  async scanAll(): Promise<{ scanned: number; anomalies: number }> {
    const profiles = await this.prisma.websiteMatchingProfile.findMany({
      select: { websiteId: true },
    });

    let scanned = 0;
    let anomalies = 0;
    for (const profile of profiles) {
      try {
        const score = await this.scanWebsite(profile.websiteId);
        scanned++;
        if (score < 50) anomalies++;
      } catch (err) {
        this.logger.error(
          `Behaviour scan failed for ${profile.websiteId}`,
          (err as Error).stack,
        );
      }
    }
    return { scanned, anomalies };
  }

  private computeGaps(timestamps: number[]): number[] {
    const gaps: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push(timestamps[i] - timestamps[i - 1]);
    }
    return gaps;
  }

  // ERRATIC_TIMING: coefficient of variation of inter-interaction gaps is very
  // high (no stable rhythm) — e.g. alternating 1h and 30d gaps.
  private detectErraticTiming(
    gaps: number[],
    count: number,
    windowStart: Date,
    windowEnd: Date,
  ): DetectedPattern | null {
    if (gaps.length < 2) return null;
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    if (mean <= 0) return null;
    const variance =
      gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;
    const cv = Math.sqrt(variance) / mean; // 0 = perfectly regular, high = erratic

    // CV above ~2.5 signals erratic cadence (gaps swing wildly around the mean).
    if (cv <= 2.5) return null;

    const severity = this.severityFromScore(Math.min(100, (cv / 5) * 100));
    const score = Math.min(100, Math.round((cv / 5) * 100));
    return {
      patternType: BehaviourPatternType.ERRATIC_TIMING,
      severity,
      score,
      evidenceJson: {
        gapCount: gaps.length,
        meanGapHours: mean / MS_PER_HOUR,
        cv: Number(cv.toFixed(2)),
      },
      windowStart,
      windowEnd,
    };
  }

  // RATING_CLUSTERING: provider ratings collapse onto a single value (e.g. all
  // exactly 5.0 or all within a tiny band) which is statistically suspicious.
  private detectRatingClustering(
    ratings: number[],
    windowStart: Date,
    windowEnd: Date,
  ): DetectedPattern | null {
    if (ratings.length < this.minInteractions) return null;
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    const range = max - min;
    // A range under ~0.5 across many ratings suggests fabricated/clustered scores.
    if (range >= 0.5) return null;

    const severity = this.severityFromScore(
      Math.min(100, (1 - range / 0.5) * 100),
    );
    const score = Math.min(100, Math.round((1 - range / 0.5) * 100));
    return {
      patternType: BehaviourPatternType.RATING_CLUSTERING,
      severity,
      score,
      evidenceJson: {
        ratingCount: ratings.length,
        min,
        max,
        range: Number(range.toFixed(2)),
      },
      windowStart,
      windowEnd,
    };
  }

  // BURST_IDLE_SWITCH: alternating long idle stretches and short intense bursts
  // (e.g. 20 interactions in 2h, then 25 days silent, then another burst).
  private detectBurstIdleSwitch(
    gaps: number[],
    windowStart: Date,
    windowEnd: Date,
  ): DetectedPattern | null {
    if (gaps.length < 4) return null;

    const burstThreshold = 6 * MS_PER_HOUR; // <=6h between interactions = "burst"
    const idleThreshold = 5 * MS_PER_DAY; // >=5d gap = "idle"

    let bursts = 0;
    let idles = 0;
    let inBurst = false;
    let burstLen = 0;
    for (const g of gaps) {
      if (g <= burstThreshold) {
        if (!inBurst) {
          inBurst = true;
          burstLen = 1;
        } else {
          burstLen++;
        }
      } else {
        if (inBurst && burstLen >= 3) bursts++;
        inBurst = false;
        burstLen = 0;
      }
      if (g >= idleThreshold) idles++;
    }
    if (inBurst && burstLen >= 3) bursts++;

    if (bursts < 2 || idles < 1) return null;

    const ratio = Math.min(1, bursts / (bursts + idles));
    const severity = this.severityFromScore(Math.min(100, ratio * 100));
    const score = Math.min(100, Math.round(ratio * 100));
    return {
      patternType: BehaviourPatternType.BURST_IDLE_SWITCH,
      severity,
      score,
      evidenceJson: {
        bursts,
        idles,
        burstThresholdHours: 6,
        idleThresholdDays: 5,
      },
      windowStart,
      windowEnd,
    };
  }

  private severityFromScore(score: number): BehaviourPatternSeverity {
    if (score >= 70) return BehaviourPatternSeverity.HIGH;
    if (score >= 40) return BehaviourPatternSeverity.MEDIUM;
    return BehaviourPatternSeverity.LOW;
  }

  // Distill detections into a 0..100 behaviourScore. Start at 100 (healthy) and
  // subtract the strongest anomaly penalty; floor at 0.
  private computeBehaviourScore(
    detections: DetectedPattern[],
    _count: number,
  ): number {
    let penalty = 0;
    for (const d of detections) {
      penalty = Math.max(penalty, d.score * 0.6);
    }
    return Math.max(0, Math.min(100, Math.round(100 - penalty)));
  }

  private async persistDetections(
    websiteId: string,
    detections: DetectedPattern[],
    windowStart: Date,
    windowEnd: Date,
  ): Promise<void> {
    if (detections.length === 0) return;
    await this.prisma.behaviourPattern.createMany({
      data: detections.map((d) => ({
        websiteId,
        patternType: d.patternType,
        severity: d.severity,
        score: d.score,
        windowStart,
        windowEnd,
        evidenceJson: (d.evidenceJson ?? null) as Prisma.InputJsonValue,
      })),
    });
  }
}

interface DetectedPattern {
  patternType: BehaviourPatternType;
  severity: BehaviourPatternSeverity;
  score: number;
  evidenceJson?: Record<string, unknown>;
  windowStart: Date;
  windowEnd: Date;
}
