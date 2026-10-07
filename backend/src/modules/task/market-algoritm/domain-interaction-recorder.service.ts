import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  normalizeRootDomain,
  buildPairKey,
  buildOrderedPairKey,
} from './root-domain-normalizer.util';
import { ValidationEngine } from './validation.engine';
import {
  ValidationResult,
  MarketplaceValidationContext,
} from './validation-result';
import { acquireMultipleDomainLocks, acquireDomainLock, acquirePairLock } from './concurrency.util';
import { ForbiddenException } from '@nestjs/common';

type TxClient = PrismaClient | Prisma.TransactionClient;

/**
 * Shared recorder for marketplace domain interactions (spec §8 / §9 / §10 / §12).
 *
 * Consolidates the previously-duplicated `recordApprovedDomainInteraction` logic
 * that lived in BOTH `task-requester.service.ts` and `admin-task.service.ts`.
 * Single source of truth for writing `DomainInteraction` (+ secondary-niche,
 * T-06), upserting the directional `DomainPairStat` cooldowns, and appending an
 * immutable `DomainRelationshipEvent` row (audit §11: preserves per-pair
 * transition history that `DomainPairStat` previously overwrote).
 *
 * Accepts a Prisma transaction client (`tx`) so it composes inside existing
 * `$transaction` blocks.
 *
 * IMPORTANT (Domain Relationship Tracking audit §18 — Critical fix):
 * This recorder is BEST-EFFORT and MUST NEVER THROW inside a completion
 * transaction. A tracking failure must not abort the task-completion flow
 * (credits, status, notifications) nor leak internal domain-tracking errors to
 * users. Root-domain validity is checked at the VALIDATION stage, not here, so
 * any missing/invalid domain at record time is swallowed and logged.
 */
export type DomainInteractionStatusValue =
  'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'DISPUTED';

export interface RecordDomainInteractionInput {
  taskId: string;
  requesterWebsiteId: string;
  providerWebsiteId: string;
  completedAt: Date;
  /**
   * Lifecycle status of the relationship record (audit §8 / §4). Defaults to
   * COMPLETED (the only previously-written state). REJECTED / CANCELLED /
   * DISPUTED are now recorded best-effort from the rejection / cancellation /
   * dispute paths so governance services are no longer blind to non-completed
   * relationships.
   */
  interactionStatus?: DomainInteractionStatusValue;
  /**
   * What triggered the event (TASK_COMPLETED / TASK_REJECTED / TASK_CANCELLED /
   * DISPUTE_RESOLVED). Defaults to TASK_COMPLETED for backward compatibility.
   */
  trigger?: string;
}

@Injectable()
export class DomainInteractionRecorderService {
  private readonly logger = new Logger(DomainInteractionRecorderService.name);

  constructor(private readonly validationEngine: ValidationEngine) {}

  /**
   * Atomic, transactional operation to validate a transition and record the interaction.
   * Acquires advisory locks to prevent concurrent validation races for the same pair and domains.
   * Throws ForbiddenException if validation fails.
   */
  async validateAndRecord(
    tx: TxClient,
    input: RecordDomainInteractionInput,
    validationInput: {
      stage: MarketplaceValidationContext;
      actorUserId: string;
      providerDomain?: string;
      requesterDomain?: string;
      task?: any;
      dailyMatches?: number;
      maxProviderMatchesPerDay?: number;
      adminOverride?: any;
    },
  ): Promise<void> {
    const domainsToLock: string[] = [];
    if (validationInput.providerDomain) domainsToLock.push(validationInput.providerDomain);
    if (validationInput.requesterDomain) domainsToLock.push(validationInput.requesterDomain);
    
    // 1. Lock root domains in deterministic order to protect velocity limits (MC-005).
    await acquireMultipleDomainLocks(tx, domainsToLock);

    // 2. Lock the specific pair to protect reciprocal/cooldown logic.
    if (validationInput.providerDomain && validationInput.requesterDomain) {
      await acquirePairLock(
        tx,
        validationInput.providerDomain,
        validationInput.requesterDomain,
      );
    }

    // 3. Recalculate daily matches inside the authoritative lock (MC-002, MC-005).
    let strictlyCalculatedDailyMatches = validationInput.dailyMatches;
    if (input.providerWebsiteId) {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      strictlyCalculatedDailyMatches = await tx.placementTask.count({
        where: {
          assignedProviderWebsiteId: input.providerWebsiteId,
          assignedAt: { gte: startOfDay },
        },
      });
    }

    const validationResult = await this.validationEngine.validateTransition(
      {
        ...validationInput,
        dailyMatches: strictlyCalculatedDailyMatches,
        providerWebsiteId: input.providerWebsiteId,
        requesterWebsiteId: input.requesterWebsiteId,
        taskId: input.taskId,
      },
      tx,
    );

    if (validationResult.decision === 'REJECTED') {
      throw new ForbiddenException(validationResult.publicMessage);
    }

    await this.recordInternal(tx, input);
  }

  /**
   * Best-effort record. Never throws to the caller (audit §18 Critical fix).
   * Returns void; any failure is logged server-side only.
   */
  async record(
    tx: TxClient,
    input: RecordDomainInteractionInput,
  ): Promise<void> {
    try {
      await this.recordInternal(tx, input);
    } catch (err: unknown) {
      // Tracking failure must never break the marketplace completion flow or
      // surface to users (audit §18 / spec: no "Internal Domain Relationship
      // Errors" reach end users).
      this.logger.error(
        `Domain interaction tracking skipped for task ${input.taskId}: ${(err as Error)?.message ?? String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  private async recordInternal(
    tx: TxClient,
    input: RecordDomainInteractionInput,
  ): Promise<void> {
    const interactionStatus: DomainInteractionStatusValue =
      input.interactionStatus ?? 'COMPLETED';
    const trigger = input.trigger ?? 'TASK_COMPLETED';

    const [requesterWebsite, providerWebsite] = await Promise.all([
      tx.website.findUnique({
        where: { id: input.requesterWebsiteId },
        select: {
          id: true,
          rootDomain: true,
          marketplaceCategories: {
            select: { role: true, category: { select: { slug: true } } },
          },
        },
      }),
      tx.website.findUnique({
        where: { id: input.providerWebsiteId },
        select: {
          id: true,
          rootDomain: true,
          marketplaceCategories: {
            select: { role: true, category: { select: { slug: true } } },
          },
        },
      }),
    ]);

    // Best-effort: if a website is missing or lacks a root domain, skip tracking
    // rather than throwing. Root-domain validity is enforced earlier at the
    // validation stage (audit §18).
    if (
      !requesterWebsite ||
      !providerWebsite ||
      !requesterWebsite.rootDomain ||
      !providerWebsite.rootDomain
    ) {
      this.logger.warn(
        `Domain interaction tracking skipped for task ${input.taskId}: missing website or root domain.`,
      );
      return;
    }

    const sourceDomain = normalizeRootDomain(providerWebsite.rootDomain);
    const targetDomain = normalizeRootDomain(requesterWebsite.rootDomain);

    if (!sourceDomain || !targetDomain) {
      this.logger.warn(
        `Domain interaction tracking skipped for task ${input.taskId}: invalid root domain after normalization.`,
      );
      return;
    }

    const pairKey = buildPairKey(sourceDomain, targetDomain);
    const orderedPairKey = buildOrderedPairKey(sourceDomain, targetDomain);
    const [domainA, domainB] = [sourceDomain, targetDomain].sort();
    const { repeat, reciprocal } =
      await this.validationEngine.getCooldownDays();
    const repeatPairCooldownUntil = this.validationEngine.getCooldownUntil(
      repeat,
      input.completedAt,
    );
    const reciprocalCooldownUntil = this.validationEngine.getCooldownUntil(
      reciprocal,
      input.completedAt,
    );

    // Record (or update status of) the immutable-append DomainInteraction row.
    // For terminal states we upsert by taskId so re-recording the same task
    // (e.g. REJECTED then CANCELLED) updates the status rather than duplicating.
    await tx.domainInteraction.upsert({
      where: { taskId: input.taskId },
      update: {
        interactionStatus,
      },
      create: {
        taskId: input.taskId,
        sourceWebsiteId: providerWebsite.id,
        targetWebsiteId: requesterWebsite.id,
        sourceDomain,
        targetDomain,
        normalizedPairKey: pairKey,
        sourcePrimaryCategoryKey:
          providerWebsite.marketplaceCategories?.find(
            (c: any) => c.role === 'PRIMARY',
          )?.category?.slug || null,
        targetPrimaryCategoryKey:
          requesterWebsite.marketplaceCategories?.find(
            (c: any) => c.role === 'PRIMARY',
          )?.category?.slug || null,
        // Spec §12 (T-06): capture secondary niche for SECONDARY-scope caps.
        sourceSecondaryCategoryKey:
          providerWebsite.marketplaceCategories?.find(
            (c: any) => c.role === 'SECONDARY',
          )?.category?.slug || null,
        targetSecondaryCategoryKey:
          requesterWebsite.marketplaceCategories?.find(
            (c: any) => c.role === 'SECONDARY',
          )?.category?.slug || null,
        interactionStatus,
        completedAt: input.completedAt,
      },
    });

    // Append-only per-pair transition history (audit §11). Never updated; gives
    // first-class reciprocal / repeat / status sequence reconstruction without
    // relying on the overwritten DomainPairStat latest-state.
    await tx.domainRelationshipEvent.create({
      data: {
        orderedPairKey,
        normalizedPairKey: pairKey,
        sourceDomain,
        targetDomain,
        domainA,
        domainB,
        interactionStatus,
        repeatPairCooldownUntil,
        reciprocalCooldownUntil,
        sourceWebsiteId: providerWebsite.id,
        targetWebsiteId: requesterWebsite.id,
        taskId: input.taskId,
        sourcePrimaryCategoryKey:
          providerWebsite.marketplaceCategories?.find(
            (c: any) => c.role === 'PRIMARY',
          )?.category?.slug || null,
        targetPrimaryCategoryKey:
          requesterWebsite.marketplaceCategories?.find(
            (c: any) => c.role === 'PRIMARY',
          )?.category?.slug || null,
        sourceSecondaryCategoryKey:
          providerWebsite.marketplaceCategories?.find(
            (c: any) => c.role === 'SECONDARY',
          )?.category?.slug || null,
        targetSecondaryCategoryKey:
          requesterWebsite.marketplaceCategories?.find(
            (c: any) => c.role === 'SECONDARY',
          )?.category?.slug || null,
        trigger,
      },
    });

    // DomainPairStat remains the live "latest-state" aggregate consumed by the
    // validation / distribution engines. Only completed interactions advance
    // the cooldown + interaction count (rejected / cancelled / disputed do not
    // create a marketplace relationship, so they are tracked but do not affect
    // cooldown math). This keeps history intact (events table) while preserving
    // the existing governance semantics.
    if (interactionStatus === 'COMPLETED') {
      const providerPrimaryKey =
        providerWebsite.marketplaceCategories?.find((c) => c.role === 'PRIMARY')
          ?.category?.slug || null;
      const providerSecondaryKey =
        providerWebsite.marketplaceCategories?.find(
          (c) => c.role === 'SECONDARY',
        )?.category?.slug || null;
      const requesterPrimaryKey =
        requesterWebsite.marketplaceCategories?.find(
          (c) => c.role === 'PRIMARY',
        )?.category?.slug || null;
      const requesterSecondaryKey =
        requesterWebsite.marketplaceCategories?.find(
          (c) => c.role === 'SECONDARY',
        )?.category?.slug || null;

      await tx.domainPairStat.upsert({
        where: { normalizedPairKey: pairKey },
        update: {
          lastSourceDomain: sourceDomain,
          lastTargetDomain: targetDomain,
          lastInteractionAt: input.completedAt,
          repeatPairCooldownUntil,
          reciprocalCooldownUntil,
          interactionCount: {
            increment: 1,
          },
          // Spec §12 (T-07): keep the pair's niche tags fresh for NicheDistributionCap.
          sourcePrimaryCategoryKey: providerPrimaryKey,
          targetPrimaryCategoryKey: requesterPrimaryKey,
          sourceSecondaryCategoryKey: providerSecondaryKey,
          targetSecondaryCategoryKey: requesterSecondaryKey,
        },
        create: {
          normalizedPairKey: pairKey,
          domainA,
          domainB,
          lastSourceDomain: sourceDomain,
          lastTargetDomain: targetDomain,
          lastInteractionAt: input.completedAt,
          repeatPairCooldownUntil,
          reciprocalCooldownUntil,
          interactionCount: 1,
          // Spec §12 (T-07): seed the pair's niche tags for NicheDistributionCap.
          sourcePrimaryCategoryKey: providerPrimaryKey,
          targetPrimaryCategoryKey: requesterPrimaryKey,
          sourceSecondaryCategoryKey: providerSecondaryKey,
          targetSecondaryCategoryKey: requesterSecondaryKey,
        },
      });
    }
  }
}
