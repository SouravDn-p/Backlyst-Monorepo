import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { InspectDomainPairQueryDto } from './dto/admin-domain-pair-inspection.dto';
import {
  normalizeRootDomain as sharedNormalizeRootDomain,
  buildPairKey as sharedBuildPairKey,
} from 'src/modules/task/market-algoritm/root-domain-normalizer.util';

/**
 * Spec §22 (M-20): Domain Pair Inspection.
 *
 * Surfaces the marketplace's per-pair aggregate (`DomainPairStat`, spec §12)
 * for an arbitrary pair of domains so an admin can inspect:
 *  - the normalized pair key actually used by `ValidationEngine.buildPairKey`
 *  - interaction count + last interaction timestamp
 *  - active repeat / reciprocal cooldowns (with remaining seconds)
 *  - the niche category tags captured on the pair
 *  - the most recent raw `DomainInteraction` rows for the pair
 *
 * The pair is identified by two raw domains (or website URLs); they are
 * normalized exactly like the engine does (`normalizeRootDomain`) and sorted
 * so direction does not matter (a provider <-> requester pair is unordered
 * for the aggregate key).
 *
 * Audit R-Repeat-6: an optional `scope` (`REPEAT_PAIR` | `RECIPROCAL`) lets an
 * admin request a rule-focused view: the response then includes only the
 * override history for that specific rule namespace, instead of the combined
 * repeat/reciprocal aggregate history. This closes the "no fine-grained
 * repeat-pair inspection surface" gap from the audit.
 *
 * No new DB model is introduced — this is a read-only inspection endpoint.
 */
@Injectable()
export class AdminDomainPairInspectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Delegates to the single shared `RootDomainNormalizer` util so this endpoint
   * computes the EXACT key the ValidationEngine uses.
   */
  private normalizeRootDomain(value: string): string {
    return sharedNormalizeRootDomain(value);
  }

  /** Build the directional-agnostic pair key (sorted, joined with `_`). */
  private buildPairKey(domainA: string, domainB: string): string {
    return sharedBuildPairKey(domainA, domainB);
  }

  private secondsUntil(date: Date | null, now: number): number | null {
    if (!date) return null;
    return Math.max(0, Math.floor((date.getTime() - now) / 1000));
  }

  async inspect(query: InspectDomainPairQueryDto) {
    const normalizedA = this.normalizeRootDomain(query.domainA);
    const normalizedB = this.normalizeRootDomain(query.domainB);

    if (!normalizedA || !normalizedB) {
      throw new NotFoundException(
        'Both domainA and domainB must resolve to a valid root domain.',
      );
    }

    const pairKey = this.buildPairKey(query.domainA, query.domainB);
    const now = Date.now();

    const stat = await this.prisma.domainPairStat.findUnique({
      where: { normalizedPairKey: pairKey },
    });

    if (!stat) {
      return sendResponse('No recorded interactions for this domain pair.', {
        pairKey,
        domainA: normalizedA,
        domainB: normalizedB,
        found: false,
        interactionCount: 0,
        cooldowns: {
          repeatPair: { active: false, until: null, remainingSeconds: null },
          reciprocal: { active: false, until: null, remainingSeconds: null },
        },
        recentInteractions: [],
        overrideHistory: query.scope
          ? await this.overrideHistory(pairKey, query.scope)
          : undefined,
      });
    }

    const repeatActive =
      stat.repeatPairCooldownUntil != null &&
      stat.repeatPairCooldownUntil.getTime() > now;
    const reciprocalActive =
      stat.reciprocalCooldownUntil != null &&
      stat.reciprocalCooldownUntil.getTime() > now;

    const limit = query.limit ?? 10;
    const recentInteractions =
      limit > 0
        ? await this.prisma.domainInteraction.findMany({
            where: { normalizedPairKey: pairKey },
            orderBy: { completedAt: 'desc' },
            take: limit,
            select: {
              id: true,
              taskId: true,
              sourceWebsiteId: true,
              targetWebsiteId: true,
              sourceDomain: true,
              targetDomain: true,
              sourcePrimaryCategoryKey: true,
              targetPrimaryCategoryKey: true,
              sourceSecondaryCategoryKey: true,
              targetSecondaryCategoryKey: true,
              completedAt: true,
            },
          })
        : [];

    const data = {
      pairKey,
      domainA: stat.domainA,
      domainB: stat.domainB,
      found: true,
      interactionCount: stat.interactionCount,
      lastInteractionAt: stat.lastInteractionAt,
      lastSourceDomain: stat.lastSourceDomain,
      lastTargetDomain: stat.lastTargetDomain,
      categories: {
        sourcePrimaryCategoryKey: stat.sourcePrimaryCategoryKey,
        targetPrimaryCategoryKey: stat.targetPrimaryCategoryKey,
        sourceSecondaryCategoryKey: stat.sourceSecondaryCategoryKey,
        targetSecondaryCategoryKey: stat.targetSecondaryCategoryKey,
      },
      cooldowns: {
        repeatPair: {
          active: repeatActive,
          until: stat.repeatPairCooldownUntil,
          remainingSeconds: this.secondsUntil(
            stat.repeatPairCooldownUntil,
            now,
          ),
        },
        reciprocal: {
          active: reciprocalActive,
          until: stat.reciprocalCooldownUntil,
          remainingSeconds: this.secondsUntil(
            stat.reciprocalCooldownUntil,
            now,
          ),
        },
      },
      createdAt: stat.createdAt,
      updatedAt: stat.updatedAt,
      recentInteractions,
      // Audit R-Repeat-6: rule-scoped override history (only when requested).
      overrideHistory: query.scope
        ? await this.overrideHistory(pairKey, query.scope)
        : undefined,
    };

    return sendResponse('Domain pair inspection retrieved successfully', data);
  }

  /**
   * Audit R-Repeat-6: returns the `AdminActionLog` rows relevant to a
   * specific rule scope for this pair. `REPEAT_PAIR` scope → only REPEAT_PAIR
   * overrides; `RECIPROCAL` scope → only RECIPROCAL_COOLDOWN overrides.
   * Cross-checks the rule name AND the affected root domains of the pair so the
   * admin sees only overrides that actually touched this pair.
   */
  private async overrideHistory(
    pairKey: string,
    scope: 'REPEAT_PAIR' | 'RECIPROCAL',
  ) {
    const rule =
      scope === 'REPEAT_PAIR' ? 'REPEAT_PAIR' : 'RECIPROCAL_COOLDOWN';
    const audits = await this.prisma.adminActionLog.findMany({
      where: {
        newValue: { path: ['rule'], equals: rule },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    return audits
      .filter((a) => {
        const val = a.newValue as any;
        return (
          Array.isArray(val?.affectedDomains) &&
          val.affectedDomains.some(
            (d: string) => d.includes(pairKey) || pairKey.includes(d),
          )
        );
      })
      .map((a) => ({
        id: a.id,
        rule: (a.newValue as any)?.rule,
        action: a.action,
        reasonCode: a.reasonCode,
        createdAt: a.createdAt,
        expiresAt: a.expiresAt,
        adminId: a.adminId,
      }));
  }
}
